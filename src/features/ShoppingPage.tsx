"use client";

import { FormEvent, useEffect, useState } from "react";

import { api } from "../lib/api/client";
import { EmptyState } from "../components/EmptyState";
import { SectionCard } from "../components/SectionCard";
import { useSuite } from "../context/SuiteContext";
import { ShoppingItem } from "../types";

export function ShoppingPage() {
  const { suite, members } = useSuite();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [form, setForm] = useState({
    name: "",
    quantity: 1,
    category: "groceries",
    requestedBy: "",
  });

  const loadItems = async () => {
    if (!suite?._id) return;
    const data = await api.get<ShoppingItem[]>(`/shopping-items?suiteId=${suite._id}`);
    setItems(data);
  };

  useEffect(() => {
    void loadItems();
  }, [suite?._id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!suite?._id) return;
    await api.post("/shopping-items", {
      suiteId: suite._id,
      ...form,
      requestedBy: form.requestedBy || members[0]?._id,
      status: "needed",
    });
    setForm({ name: "", quantity: 1, category: "groceries", requestedBy: "" });
    await loadItems();
  };

  const markBought = async (item: ShoppingItem, boughtBy: string) => {
    await api.patch(`/shopping-items/${item._id}`, { ...item, status: "bought", boughtBy });
    await loadItems();
  };

  const nameFor = (id?: string | null) => members.find((member) => member._id === id)?.name || "Unknown";

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <SectionCard title="Add Item" subtitle="Track shared needs before the next store run">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Eggs"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <input
            className="input"
            type="number"
            min={1}
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })}
          />
          <select
            className="input"
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          >
            <option value="groceries">Groceries</option>
            <option value="cleaning">Cleaning</option>
            <option value="household">Household</option>
          </select>
          <select
            className="input"
            value={form.requestedBy}
            onChange={(event) => setForm({ ...form, requestedBy: event.target.value })}
          >
            <option value="">Requested by...</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
          <button className="button-primary w-full" type="submit">
            Add Item
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Shopping List" subtitle="Quick visibility into who needed what and who picked it up">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item._id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.name} <span className="text-slate-400">x{item.quantity}</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.category} • requested by {nameFor(item.requestedBy)}
                  </p>
                </div>
                {item.status === "needed" ? (
                  <select
                    className="input max-w-44"
                    onChange={(event) => markBought(item, event.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Mark bought by...
                    </option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="pill bg-emerald-100 text-emerald-800">Bought by {nameFor(item.boughtBy)}</span>
                )}
              </div>
            </div>
          ))}
          {!items.length ? <EmptyState label="Nothing on the list yet." /> : null}
        </div>
      </SectionCard>
    </div>
  );
}
