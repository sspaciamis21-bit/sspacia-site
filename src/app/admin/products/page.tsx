'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, XCircle, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { AddProductModal } from '@/components/admin/add-product-modal';
import { ProductType, SpaceCategory } from '@prisma/client';

interface RecentProduct {
  id: number;
  locationId: number;
  name: string;
  slug: string;
  type: ProductType;
  category: SpaceCategory;
  description?: string;
  accessTime?: string;
  capacity?: number;
  quantity: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  location: { id: number; name: string };
  images?: { id: number; url: string; isPrimary: boolean }[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<RecentProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<RecentProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/products');
        const json = await res.json();

        if (json.data) {
          setProducts(json.data);
        } else {
          setProducts([]);
        }
      } catch {
        toast.error('Failed to load products');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      const json = await res.json();

      if (json.data) {
        setProducts(json.data);
      } else {
        setProducts([]);
      }
    } catch {
      toast.error('Failed to load products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProduct = (product: RecentProduct) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const confirmDeleteProduct = (product: RecentProduct) => {
    setDeletingProduct(product);
  };

  const closeDeleteModal = () => {
    setDeletingProduct(null);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/products/${deletingProduct.id}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Failed to delete product');

      toast.success(`Product "${deletingProduct.name}" deactivated.`);
      closeDeleteModal();
      await fetchProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <FadeUp>
          <h1 className="text-3xl font-bold text-[#004D40]">Product Inventory</h1>
          <p className="text-[#616161]">Manage SSPACIA workspace products, desks, and amenities.</p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006064] text-white rounded-lg font-bold shadow-lg shadow-[#006064]/20 hover:bg-[#004D40] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={20} />
            Add New Product
          </button>
        </FadeUp>
      </div>

      <FadeUp delay={0.2}>
        <div className="bg-white rounded-xl border border-[#CFD8DC]/30 shadow-sm p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="mx-auto h-6 w-6 text-[#006064] animate-spin" />
              <p className="text-sm font-bold text-[#616161] mt-3">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center text-[#616161] py-16">
              <p className="text-lg font-bold">No products found.</p>
              <p className="text-sm mt-2">Create your first product to start booking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] uppercase text-xs font-bold text-[#9E9E9E] tracking-widest">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Featured</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFD8DC]/20">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-[#E0F7FA]/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-[#212121]">{product.name}</td>
                      <td className="px-4 py-3 text-sm text-[#616161]">{product.location.name}</td>
                      <td className="px-4 py-3 text-sm text-[#616161]">{product.type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-[#616161]">{product.category.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        {product.isActive ? (
                          <div className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs">
                            <CheckCircle2 size={12} /> Active
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-red-500 font-bold text-xs">
                            <XCircle size={12} /> Inactive
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                      {product.isFeatured ? <span className="text-xs font-bold text-[#004D40]">Yes</span> : <span className="text-xs text-[#616161]">No</span>}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-1.5 text-[#9E9E9E] hover:text-[#006064] hover:bg-[#E0F7FA] rounded-md"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => confirmDeleteProduct(product)}
                        className="p-1.5 text-[#9E9E9E] hover:text-red-600 hover:bg-red-50 rounded-md"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FadeUp>

    <AddProductModal
        isOpen={isModalOpen}
        product={editingProduct ?? undefined}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={async () => {
          await fetchProducts();
          setEditingProduct(null);
        }}
      />
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#CFD8DC]/30 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#CFD8DC]/30">
              <h3 className="text-lg font-bold text-[#004D40]">Confirm Deletion</h3>
              <p className="mt-1 text-sm text-[#616161]">Are you sure you want to deactivate <strong>{deletingProduct.name}</strong>?</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#424242]">This action will mark the product as inactive and remove it from active listings.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg border border-[#CFD8DC]/60 text-sm font-bold text-[#616161] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}    </div>
  );
}
