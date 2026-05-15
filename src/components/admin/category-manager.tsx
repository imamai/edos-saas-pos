"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag } from "lucide-react";
import type { Category } from "@/types";

export default function CategoryManager() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("categories").select("*").order("name");
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }

  async function addCategory() {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("categories").insert({ name: newName.trim(), description: newDesc.trim() || null, is_active: true });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Category added");
    setNewName(""); setNewDesc(""); setAdding(false);
    load();
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("categories").update({ name: editName.trim(), description: editDesc.trim() || null }).eq("id", id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Category updated");
    setEditingId(null);
    load();
  }

  async function toggleActive(cat: Category) {
    const { error } = await supabase.from("categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    if (error) { toast.error(error.message); return; }
    toast.success(cat.is_active ? "Category deactivated" : "Category activated");
    load();
  }

  async function deleteCategory(id: string) {
    const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
    if ((count ?? 0) > 0) {
      toast.error(`Cannot delete — ${count} product(s) use this category`);
      return;
    }
    if (!confirm("Delete this category permanently?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Category deleted");
    load();
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description ?? "");
  }

  const ic = "px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white">Product Categories</h3>
          <p className="text-xs text-slate-500 mt-0.5">Manage categories used for organising your products</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">New Category</p>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Category name *" className={ic + " w-full"} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" className={ic + " w-full"} />
          <div className="flex gap-2">
            <button onClick={addCategory} disabled={saving || !newName.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
            </button>
            <button onClick={() => { setAdding(false); setNewName(""); setNewDesc(""); }} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category list */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No categories yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {categories.map((cat) => (
              <li key={cat.id} className="px-5 py-3">
                {editingId === cat.id ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} className={ic + " flex-1 min-w-32"} />
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className={ic + " flex-1 min-w-40"} />
                    <button onClick={() => saveEdit(cat.id)} disabled={saving} className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${cat.is_active ? "text-slate-800 dark:text-white" : "text-slate-400 line-through"}`}>{cat.name}</p>
                        {!cat.is_active && <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-full">Inactive</span>}
                      </div>
                      {cat.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{cat.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(cat)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 transition" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(cat)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-600 transition" title={cat.is_active ? "Deactivate" : "Activate"}>
                        {cat.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 transition" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
