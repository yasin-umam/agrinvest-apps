import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Check, X, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';

type ChiliProduct = Database['public']['Tables']['chili_products']['Row'];

export function ProductManagement() {
  const [products, setProducts] = useState<ChiliProduct[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    image_url: '',
    category: '',
    grade: 'standard' as 'premium' | 'standard' | 'economy',
    unit: 'kg',
    current_price: '',
    total_volume: '',
    available_units: '',
    harvest_status: 'growing' as 'planted' | 'growing' | 'ready' | 'harvested',
    harvest_kg: '',
    harvest_revenue: '',
    area_size: '',
    plant_population: '',
    cost_per_plant: '',
    cost_per_area: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const { user } = useAuth();

  const formatNumberDisplay = (value: string): string => {
    if (!value) return '';
    const numValue = value.replace(/\D/g, '');
    if (!numValue) return '';
    return parseInt(numValue).toLocaleString('id-ID');
  };

  const parseFormattedNumber = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  const handleIntegerInput = (field: string, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleFormattedIntegerInput = (field: string, value: string) => {
    const cleanValue = parseFormattedNumber(value);
    setFormData({ ...formData, [field]: cleanValue });
  };

  const handleDecimalInput = (field: string, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('chili_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data);
    }
  };

  useEffect(() => {
    loadProducts();

    const channel = supabase
      .channel('admin-products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chili_products'
        },
        (payload) => {
          console.log('AdminPage: Realtime update received', payload);
          loadProducts();
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error('AdminPage: Subscription error:', error);
        }
        console.log('AdminPage: Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      image_url: '',
      category: '',
      grade: 'standard',
      unit: 'kg',
      current_price: '',
      total_volume: '',
      available_units: '',
      harvest_status: 'growing',
      harvest_kg: '',
      harvest_revenue: '',
      area_size: '',
      plant_population: '',
      cost_per_plant: '',
      cost_per_area: '',
      location: '',
    });
    setEditingId(null);
    setShowForm(false);
    setImageFile(null);
    setImagePreview('');
  };

  const handleEdit = (product: ChiliProduct) => {
    setFormData({
      name: product.name,
      code: product.code,
      description: product.description,
      image_url: product.image_url || '',
      category: product.category,
      grade: product.grade,
      unit: product.unit,
      current_price: product.current_price.toString(),
      total_volume: product.total_volume.toString(),
      available_units: product.available_units.toString(),
      harvest_status: product.harvest_status,
      harvest_kg: '',
      harvest_revenue: '',
      area_size: product.area_size.toString(),
      plant_population: product.plant_population.toString(),
      cost_per_plant: product.cost_per_plant.toString(),
      cost_per_area: product.cost_per_area.toString(),
      location: product.location || '',
    });
    setImagePreview(product.image_url || '');
    setEditingId(product.id);
    setShowForm(true);
  };

  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(null);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      console.log('Starting image upload to storage...');

      const compressedBlob = await compressImage(file);
      if (!compressedBlob) {
        console.error('Failed to compress image');
        setUploadingImage(false);
        return null;
      }

      console.log('Image compressed, original size:', (file.size / 1024).toFixed(2), 'KB, compressed size:', (compressedBlob.size / 1024).toFixed(2), 'KB');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      console.log('Uploading to storage:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedBlob, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        alert(`Gagal mengupload gambar: ${uploadError.message}`);
        setUploadingImage(false);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      console.log('Image uploaded successfully:', urlData.publicUrl);
      setUploadingImage(false);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadingImage(false);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('=== FORM SUBMIT START ===');
    console.log('User:', user?.id);
    console.log('Form Data:', formData);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        console.log('Uploading new image...');
        const uploadedUrl = await handleImageUpload(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
          console.log('Image uploaded successfully, size:', uploadedUrl.length);
        } else {
          console.error('Failed to upload image');
          alert('Gagal mengupload gambar. Silakan coba lagi.');
          setLoading(false);
          return;
        }
      }

      const harvestKg = formData.harvest_kg ? parseFloat(formData.harvest_kg) : 0;
      const harvestRevenue = formData.harvest_revenue ? parseInt(formData.harvest_revenue) : 0;

      if (editingId) {
        const { data: existingProduct } = await supabase
          .from('chili_products')
          .select('harvest_kg, total_revenue, harvest_count, harvest_status')
          .eq('id', editingId)
          .single();

        let newHarvestKg = existingProduct?.harvest_kg || 0;
        let newTotalRevenue = existingProduct?.total_revenue || 0;
        let newHarvestCount = existingProduct?.harvest_count || 0;

        console.log('Harvest data:', {
          harvest_status: formData.harvest_status,
          harvestKg,
          harvestRevenue
        });

        if (formData.harvest_status === 'harvested' && harvestKg > 0 && harvestRevenue > 0) {
          console.log('Processing harvest distribution...');

          newHarvestKg += harvestKg;
          newTotalRevenue += harvestRevenue;

          if (existingProduct?.harvest_status !== 'harvested') {
            newHarvestCount = 1;
          } else {
            newHarvestCount += 1;
          }

          const { error: historyError } = await supabase
            .from('harvest_revenue_history')
            .insert({
              product_id: editingId,
              harvest_kg: harvestKg,
              harvest_revenue: harvestRevenue,
            });

          if (historyError) {
            console.error('Error inserting harvest history:', historyError);
            alert(`Gagal mencatat harvest: ${historyError.message}`);
          } else {
            console.log('Harvest recorded. Trigger will automatically distribute dividends to all unit owners.');

            await new Promise(resolve => setTimeout(resolve, 1000));

            const { data: distributionData } = await supabase
              .from('user_harvest_distributions')
              .select('user_id, units_owned, user_revenue, ownership_percentage')
              .eq('product_id', editingId)
              .order('created_at', { ascending: false })
              .limit(100);

            const recentDistributions = distributionData?.filter(d => {
              const createdAt = new Date(d.created_at);
              const now = new Date();
              return (now.getTime() - createdAt.getTime()) < 5000;
            }) || [];

            if (recentDistributions.length > 0) {
              const totalDistributed = recentDistributions.reduce((sum, d) => sum + (d.user_revenue || 0), 0);
              alert(`Dividend berhasil didistribusikan secara otomatis!\n\nTotal Revenue: Rp ${harvestRevenue.toLocaleString('id-ID')}\nPenerima: ${recentDistributions.length} pemilik unit\nTotal Distributed: Rp ${totalDistributed.toLocaleString('id-ID')}\n\nSemua pemilik unit telah menerima dividen sesuai kepemilikan mereka.`);
            } else {
              alert('Harvest berhasil dicatat. Dividen akan otomatis didistribusikan ke semua pemilik unit.');
            }
          }

          const { error: trendError } = await supabase.rpc('update_revenue_trend', {
            p_product_id: editingId,
          });

          if (trendError) {
            console.error('Error updating revenue trend:', trendError);
          }
        } else {
          console.log('Skipping harvest distribution - conditions not met');
        }

        const sellingPricePerKg = newHarvestKg > 0 ? newTotalRevenue / newHarvestKg : 0;

        const plantPopulation = parseInt(formData.plant_population) || 0;
        const costPerPlant = parseInt(formData.cost_per_plant) || 0;
        const calculatedCostPerArea = plantPopulation * costPerPlant;

        console.log('Updating product with image_url length:', imageUrl?.length || 0);

        const { error: updateError } = await supabase
          .from('chili_products')
          .update({
            name: formData.name,
            description: formData.description,
            image_url: imageUrl || null,
            category: formData.category,
            grade: formData.grade,
            unit: formData.unit,
            current_price: parseInt(formData.current_price) || 0,
            total_volume: parseFloat(formData.total_volume) || 0,
            available_units: parseInt(formData.available_units) || 0,
            harvest_status: formData.harvest_status,
            harvest_kg: newHarvestKg,
            total_revenue: newTotalRevenue,
            harvest_count: newHarvestCount,
            selling_price_per_kg: sellingPricePerKg,
            area_size: parseFloat(formData.area_size) || 0,
            plant_population: plantPopulation,
            cost_per_plant: costPerPlant,
            cost_per_area: calculatedCostPerArea,
            location: formData.location || null,
          })
          .eq('id', editingId);

        if (updateError) {
          console.error('Error updating product:', updateError);
          alert(`Gagal mengupdate produk: ${updateError.message}`);
          setLoading(false);
          return;
        }

        console.log('Product updated successfully');
      } else {
        const plantPopulation = parseInt(formData.plant_population) || 0;
        const costPerPlant = parseInt(formData.cost_per_plant) || 0;
        const calculatedCostPerArea = plantPopulation * costPerPlant;

        const insertData = {
          name: formData.name,
          code: formData.code,
          description: formData.description,
          image_url: imageUrl || null,
          category: formData.category,
          grade: formData.grade,
          unit: formData.unit,
          current_price: parseInt(formData.current_price) || 0,
          total_volume: parseFloat(formData.total_volume) || 0,
          available_units: parseInt(formData.available_units) || 0,
          harvest_status: formData.harvest_status,
          area_size: parseFloat(formData.area_size) || 0,
          plant_population: plantPopulation,
          cost_per_plant: costPerPlant,
          cost_per_area: calculatedCostPerArea,
          location: formData.location || null,
        };

        console.log('Inserting product with data:', insertData);
        console.log('Image URL length:', imageUrl?.length || 0);

        const { error: insertError, data: insertedData } = await supabase
          .from('chili_products')
          .insert(insertData)
          .select();

        if (insertError) {
          console.error('=== INSERT ERROR ===');
          console.error('Error code:', insertError.code);
          console.error('Error message:', insertError.message);
          console.error('Error details:', insertError.details);
          console.error('Error hint:', insertError.hint);
          alert(`Gagal menambahkan produk: ${insertError.message}\n\nDetail: ${insertError.details || 'Tidak ada'}\n\nHint: ${insertError.hint || 'Tidak ada'}`);
          setLoading(false);
          return;
        }

        console.log('Product inserted successfully:', insertedData);
      }

      await loadProducts();
      alert(`Produk berhasil ${editingId ? 'diupdate' : 'ditambahkan'}!`);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    await supabase
      .from('chili_products')
      .delete()
      .eq('id', id);

    await loadProducts();
  };

  const toggleActive = async (product: ChiliProduct) => {
    await supabase
      .from('chili_products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);

    await loadProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Product Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  disabled={!!editingId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or WebP (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('Ukuran file terlalu besar. Maksimal 5MB.');
                              e.target.value = '';
                              return;
                            }
                            console.log('New image selected:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB');
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  </div>
                  {(imagePreview || formData.image_url) && (
                    <div className="flex-shrink-0 relative">
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                          setFormData({ ...formData, image_url: '' });
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {uploadingImage && (
                  <p className="text-sm text-blue-600 mt-2">Uploading image...</p>
                )}
                {imageFile && !uploadingImage && (
                  <p className="text-sm text-green-600 mt-2">Gambar baru dipilih: {imageFile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., red_chili, green_chili"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="economy">Economy</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Price (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberDisplay(formData.current_price)}
                  onChange={(e) => handleFormattedIntegerInput('current_price', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Contoh: 1.000.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Volume Produk
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.total_volume}
                  onChange={(e) => handleDecimalInput('total_volume', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Contoh: 1000 atau 1000.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Tersedia untuk Dijual
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.available_units}
                  onChange={(e) => handleIntegerInput('available_units', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Contoh: 500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Jumlah unit yang tersedia untuk dibeli oleh user
                </p>
              </div>

              <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Informasi Lahan</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Luas Area (m²)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formData.area_size}
                      onChange={(e) => handleDecimalInput('area_size', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Contoh: 1000 atau 1000.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Populasi Tanaman
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.plant_population}
                      onChange={(e) => handleIntegerInput('plant_population', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Contoh: 500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modal per Tanaman (Rp)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberDisplay(formData.cost_per_plant)}
                      onChange={(e) => handleFormattedIntegerInput('cost_per_plant', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Contoh: 5.000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modal per Area (Rp) - Otomatis
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const population = parseInt(formData.plant_population) || 0;
                        const costPerPlant = parseInt(formData.cost_per_plant) || 0;
                        const total = population * costPerPlant;
                        return total > 0 ? `Rp ${total.toLocaleString('id-ID')}` : 'Rp 0';
                      })()}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      placeholder="Dihitung otomatis"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Populasi Tanaman × Modal per Tanaman
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lokasi
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Contoh: Bandung, Jawa Barat"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harvest Status
                </label>
                <select
                  value={formData.harvest_status}
                  onChange={(e) => setFormData({ ...formData, harvest_status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="planted">Planted</option>
                  <option value="growing">Growing</option>
                  <option value="ready">Ready</option>
                  <option value="harvested">Harvested</option>
                </select>
              </div>

              {formData.harvest_status === 'harvested' && editingId && (
                <>
                  <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Add Harvest Data (Accumulative)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-2">
                          Harvest Quantity (kg)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formData.harvest_kg}
                          onChange={(e) => handleDecimalInput('harvest_kg', e.target.value)}
                          className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter kg to add (e.g., 100 or 100.5)"
                        />
                        <p className="text-xs text-green-600 mt-1">
                          This will be added to existing quantity
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-2">
                          Harvest Revenue (Rp)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumberDisplay(formData.harvest_revenue)}
                          onChange={(e) => handleFormattedIntegerInput('harvest_revenue', e.target.value)}
                          className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Contoh: 1.000.000"
                        />
                        <p className="text-xs text-green-600 mt-1">
                          Will be added to admin balance & total revenue
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition"
              >
                {loading ? 'Saving...' : editingId ? 'Update Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Volume
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Available
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const isSoldOut = product.available_units <= 0;
                return (
                  <tr key={product.id} className={`hover:bg-gray-50 ${isSoldOut ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.grade}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{product.code}</td>
                    <td className="px-6 py-4 text-gray-600">{product.category}</td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      Rp {product.current_price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {product.total_volume.toLocaleString('id-ID')} {product.unit}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-semibold ${isSoldOut ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.available_units.toLocaleString('id-ID')}
                        </span>
                        {isSoldOut && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            SOLD OUT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(product)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          product.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {product.is_active ? (
                          <>
                            <Check className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
