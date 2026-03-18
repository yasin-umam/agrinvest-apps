import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Check, X, Upload } from 'lucide-react';

interface Region {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  image_url: string | null;
  company_count: number;
  total_company_value: number;
  available_units: number;
  current_price: number;
  price_change_percent_24h: number | null;
  total_volume: number;
  total_revenue: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_units: number;
  price_per_unit: number;
}

export function RegionManagement() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    image_url: '',
    company_count: '',
    total_company_value: '',
    available_units: '',
    current_price: '',
    price_change_percent_24h: '',
    total_volume: '',
    total_revenue: '',
    total_units: '',
    price_per_unit: '',
  });

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const syncRegionValueFields = (nextData: typeof formData) => {
    const totalCompanyValue = parseFloat(nextData.total_company_value) || 0;
    const totalUnits = parseFloat(nextData.total_units) || parseFloat(nextData.total_volume) || 0;
    const derivedPricePerUnit = totalUnits > 0 ? Math.round(totalCompanyValue / totalUnits) : 0;

    return {
      ...nextData,
      total_units: totalUnits > 0 ? String(totalUnits) : nextData.total_units,
      total_volume: totalUnits > 0 ? String(totalUnits) : nextData.total_volume,
      price_per_unit: derivedPricePerUnit > 0 ? String(derivedPricePerUnit) : '',
      current_price: derivedPricePerUnit > 0 ? String(derivedPricePerUnit) : '',
    };
  };

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

  const loadRegions = async () => {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRegions(data as Region[]);
    }
  };

  useEffect(() => {
    loadRegions();

    const regionChannel = supabase
      .channel('admin-regions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'regions'
        },
        (payload) => {
          console.log('Region realtime update:', payload);
          loadRegions();
        }
      )
      .subscribe();

    return () => {
      regionChannel.unsubscribe();
    };
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      image_url: '',
      company_count: '',
      total_company_value: '',
      available_units: '',
      current_price: '',
      price_change_percent_24h: '',
      total_volume: '',
      total_revenue: '',
      total_units: '',
      price_per_unit: '',
    });
    setEditingId(null);
    setShowForm(false);
    setImageFile(null);
    setImagePreview('');
  };

  const handleEdit = (region: Region) => {
    setFormData({
      name: region.name,
      code: region.code || '',
      description: region.description || '',
      image_url: region.image_url || '',
      company_count: region.company_count.toString(),
      total_company_value: region.total_company_value.toString(),
      available_units: region.available_units.toString(),
      current_price: region.current_price.toString(),
      price_change_percent_24h: region.price_change_percent_24h?.toString() || '',
      total_volume: region.total_volume.toString(),
      total_revenue: region.total_revenue.toString(),
      total_units: region.total_units.toString(),
      price_per_unit: region.price_per_unit.toString(),
    });
    setImagePreview(region.image_url || '');
    setEditingId(region.id);
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
      const compressedBlob = await compressImage(file);
      if (!compressedBlob) {
        console.error('Failed to compress image');
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `regions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedBlob, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        alert(`Failed to upload image: ${uploadError.message}`);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.image_url;

      if (imageFile) {
        const uploadedUrl = await handleImageUpload(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          alert('Failed to upload image. Please try again.');
          setLoading(false);
          return;
        }
      }

      if (editingId) {
        const totalUnits = parseFloat(formData.total_units) || parseFloat(formData.total_volume) || 0;
        const pricePerUnit = parseFloat(formData.price_per_unit) || parseInt(formData.current_price) || 0;
        const { error: updateError } = await (supabase.from('regions') as unknown as any)
          .update({
            name: formData.name,
            code: formData.code || null,
            description: formData.description,
            image_url: imageUrl || null,
            company_count: parseInt(formData.company_count) || 0,
            total_company_value: parseFloat(formData.total_company_value) || 0,
            current_price: pricePerUnit,
            price_change_percent_24h: parseFloat(formData.price_change_percent_24h) || 0,
            total_volume: totalUnits,
            total_revenue: parseFloat(formData.total_revenue) || 0,
            total_units: totalUnits,
            price_per_unit: pricePerUnit,
          })
          .eq('id', editingId);

        if (updateError) {
          console.error('Error updating region:', updateError);
          alert(`Failed to update region: ${updateError.message}`);
          setLoading(false);
          return;
        }
      } else {
        const totalUnits = parseFloat(formData.total_units) || parseFloat(formData.total_volume) || 0;
        const pricePerUnit = parseFloat(formData.price_per_unit) || parseInt(formData.current_price) || 0;
        const { error: insertError } = await supabase
          .from('regions')
          .insert({
            name: formData.name,
            code: formData.code || null,
            description: formData.description,
            image_url: imageUrl || null,
            company_count: parseInt(formData.company_count) || 0,
            total_company_value: parseFloat(formData.total_company_value) || 0,
            current_price: pricePerUnit,
            price_change_percent_24h: parseFloat(formData.price_change_percent_24h) || 0,
            total_volume: totalUnits,
            total_revenue: parseFloat(formData.total_revenue) || 0,
            total_units: totalUnits,
            price_per_unit: pricePerUnit,
          } as any);

        if (insertError) {
          console.error('Error inserting region:', insertError);
          alert(`Failed to add region: ${insertError.message}`);
          setLoading(false);
          return;
        }
      }

      await loadRegions();
      alert(`Region successfully ${editingId ? 'updated' : 'added'}!`);
      resetForm();
    } catch (error) {
      console.error('Error saving region:', error);
      alert('An error occurred!');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this region?')) return;

    await supabase
      .from('regions')
      .delete()
      .eq('id', id);

    await loadRegions();
  };

  const toggleActive = async (region: Region) => {
    await (supabase.from('regions') as unknown as any)
      .update({ is_active: !region.is_active })
      .eq('id', region.id);

    await loadRegions();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Region Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
        >
          <Plus className="w-4 h-4" />
          Add Region
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Region' : 'Add New Region'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!editingId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region Image
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
                              alert('File too large. Maximum 5MB.');
                              e.target.value = '';
                              return;
                            }
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Count
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.company_count}
                  onChange={(e) => handleIntegerInput('company_count', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Company Value (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberDisplay(formData.total_company_value)}
                  onChange={(e) => {
                    const value = parseFormattedNumber(e.target.value);
                    setFormData(syncRegionValueFields({
                      ...formData,
                      total_company_value: value,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 100,000,000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Units <span className="text-xs text-gray-500">(Auto-calculated)</span>
                </label>
                <input
                  type="text"
                  value={formData.available_units}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga per Unit (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberDisplay(formData.price_per_unit)}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  placeholder="e.g., 1,000,000"
                />
                <p className="mt-1 text-xs text-gray-500">Otomatis dihitung dari total nilai perusahaan dibagi total unit</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Change % (24h)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.price_change_percent_24h}
                  onChange={(e) => handleDecimalInput('price_change_percent_24h', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Unit
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.total_units}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setFormData(syncRegionValueFields({
                        ...formData,
                        total_units: value,
                        total_volume: value,
                      }));
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Price (Sinkron)
                </label>
                <input
                  type="text"
                  value={formatNumberDisplay(formData.current_price)}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Volume (Sinkron)
                </label>
                <input
                  type="text"
                  value={formData.total_volume}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Revenue (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatNumberDisplay(formData.total_revenue)}
                  onChange={(e) => handleFormattedIntegerInput('total_revenue', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 500,000,000"
                />
              </div>
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
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition"
              >
                {loading ? 'Saving...' : editingId ? 'Update Region' : 'Add Region'}
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
                  Name
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Companies
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Total Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Total Unit
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Available Units
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Harga per Unit
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Total Revenue
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
              {regions.map((region) => (
                <tr key={region.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {region.image_url && (
                        <img
                          src={region.image_url}
                          alt={region.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div className="font-medium text-gray-900">{region.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-900">
                    {region.company_count}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    Rp {region.total_company_value.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    {region.total_units.toLocaleString('id-ID')} unit
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    <span className={region.available_units > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {region.available_units.toLocaleString('id-ID')} unit
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    Rp {region.price_per_unit.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">
                    Rp {region.total_revenue.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleActive(region)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        region.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {region.is_active ? (
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
                        onClick={() => handleEdit(region)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(region.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {regions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No regions found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
