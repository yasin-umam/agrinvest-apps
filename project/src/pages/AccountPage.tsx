import { useState, useRef, useEffect } from 'react';
import { User, Mail, FileText, Users, Trash2, Save, Edit3, AlertTriangle, Camera, ArrowLeft, Key, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatRupiah } from '../lib/formatters';

interface AccountPageProps {
  onBack: () => void;
}

interface LatestDividend {
  user_revenue: number;
  units_owned: number;
  revenue_per_unit: number;
  harvest_kg: number;
  created_at: string;
}

export function AccountPage({ onBack }: AccountPageProps) {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [profileImage, setProfileImage] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [latestDividend, setLatestDividend] = useState<LatestDividend | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    bio: '',
    gender: 'Tidak ingin menyebutkan'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchLatestDividend = async () => {
      if (!profile) return;

      try {
        const { data, error } = await supabase
          .from('user_harvest_distributions')
          .select('user_revenue, units_owned, revenue_per_unit, harvest_kg, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setLatestDividend(data);
        }
      } catch (error) {
        console.error('Error fetching latest dividend:', error);
      }
    };

    fetchLatestDividend();
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          avatar_url: profileImage,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (error) throw error;

      alert('Account deleted successfully');
      await signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account');
    }
  };

  const compressImage = (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxDimension = 800;
          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => resolve(null);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large. Maximum 2MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('File must be an image.');
      return;
    }

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      if (!compressedBlob) {
        alert('Failed to process image');
        setUploading(false);
        return;
      }

      console.log('Image compressed, original size:', (file.size / 1024).toFixed(2), 'KB, compressed size:', (compressedBlob.size / 1024).toFixed(2), 'KB');

      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}/avatar.${fileExt}`;

      const { data: existingFiles } = await supabase.storage
        .from('profile-images')
        .list(profile?.id || '');

      if (existingFiles && existingFiles.length > 0) {
        for (const existingFile of existingFiles) {
          await supabase.storage
            .from('profile-images')
            .remove([`${profile?.id}/${existingFile.name}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        alert(`Failed to upload image: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setProfileImage(avatarUrl);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile?.id ?? '');

      if (updateError) throw updateError;

      await refreshProfile();
      setUploading(false);
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      alert('Password updated successfully!');
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password');
    }
  };

  return (
    <div className="space-y-6 px-4 pt-20">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:border-green-500 hover:-translate-y-px"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      </div>

      <div className="max-w-5xl mx-auto mt-8 bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200">
          <div className="relative">
            <img
              src={profileImage || 'https://via.placeholder.com/80'}
              alt="Profile"
              className={`w-20 h-20 rounded-full object-cover border-3 border-green-500 transition-all ${
                isEditing ? 'cursor-pointer hover:opacity-80' : ''
              }`}
              onClick={() => isEditing && fileInputRef.current?.click()}
            />
            {isEditing && (
              <div
                className="absolute bottom-0 right-0 bg-green-500 rounded-full w-7 h-7 flex items-center justify-center cursor-pointer border-2 border-white shadow-md"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={14} className="text-white" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">
              {formData.fullName}
            </h2>
            <p className="text-sm text-gray-600">
              Investor • Joined {new Date(profile?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {isEditing && (
                <span className="block text-xs text-green-500 mt-1">
                  Click photo to change
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Balance and Latest Harvest Section */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Saldo Anda</p>
                <p className="text-3xl font-bold text-gray-900">
                  Rp {profile?.balance ? formatRupiah(profile.balance) : '0'}
                </p>
              </div>
            </div>

            {latestDividend && (() => {
              const previousBalance = (profile?.balance || 0) - latestDividend.user_revenue;
              const percentageIncrease = previousBalance > 0
                ? ((latestDividend.user_revenue / previousBalance) * 100).toFixed(2)
                : '0.00';

              return (
                <div className="pt-4 border-t border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-500 rounded-full p-2">
                      <TrendingUp size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        Dividen Panen Terakhir
                      </p>
                      <div className="flex items-baseline gap-3 mb-2">
                        <p className="text-2xl font-bold text-green-600">
                          + Rp {formatRupiah(latestDividend.user_revenue)}
                        </p>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                          +{percentageIncrease}%
                        </span>
                      </div>
  
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                        <span>
                          Unit Anda: <strong>{latestDividend.units_owned}</strong>
                        </span>
                        <span>
                          Per Unit: <strong>Rp {formatRupiah(latestDividend.revenue_per_unit)}</strong>
                        </span>
                        <span>
                          Total Panen: <strong>{latestDividend.harvest_kg} kg</strong>
                        </span>
                        <span>
                          {new Date(latestDividend.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
 
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div>
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <User size={16} />
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your full name"
              className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 transition-all outline-none ${
                isEditing
                  ? 'bg-white border-gray-300 focus:border-green-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 bg-gray-50"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <FileText size={16} />
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              disabled={!isEditing}
              placeholder="Tell us about your investment experience..."
              className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 min-h-[120px] resize-y transition-all outline-none ${
                isEditing
                  ? 'bg-white border-gray-300 focus:border-green-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Users size={16} />
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-4 py-3 border-2 rounded-xl text-gray-900 transition-all outline-none ${
                isEditing
                  ? 'bg-white border-gray-300 focus:border-green-500 cursor-pointer'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <option value="Laki-laki">Male</option>
              <option value="Perempuan">Female</option>
              <option value="Tidak ingin menyebutkan">Prefer not to say</option>
            </select>
          </div>

          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:bg-green-600"
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center gap-2 border border-gray-300 transition-all hover:bg-gray-200"
                >
                  <Key size={16} />
                  Change Password
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading || uploading}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:bg-green-600 disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold border border-gray-300 transition-all hover:bg-gray-200"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showPasswordForm && (
        <div className="max-w-5xl mx-auto mt-6 bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 outline-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold transition-all hover:bg-green-600"
              >
                Update Password
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold border border-gray-300 transition-all hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="max-w-5xl mx-auto mt-6 bg-red-50 rounded-2xl p-8 shadow-lg border border-red-200">
        <div className="flex items-start gap-4">
          <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Delete Account
            </h3>
            <p className="text-sm text-red-900 mb-4 leading-relaxed">
              This action will permanently delete your account and all investment data.
              This process cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all hover:bg-red-600"
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-500" />
              <h3 className="text-xl font-semibold text-red-700">
                Confirm Account Deletion
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to delete this account? All your investment data and portfolio
              will be permanently lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold border border-gray-300 transition-all hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold transition-all hover:bg-red-600"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
