import { useEffect, useState } from "react";
import Header from "../components/Header";
import OutfitSection from "../components/OutfitSection";
import WardrobeSection from "../components/WardrobeSection";
import FloatingAddButton from "../components/FloatingAddButton";
import AddItemModal from "../components/ItemModal";
import "./Home.css";
import toast from "react-hot-toast";

const tagMap = { Shirt: "Shirts", Pant: "Pants", Others: "Others" };

const Home = () => {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  const toTitleCase = (text) => {
    if (!text) return "";
    return text
      .replace(/[_-]/g, " ")
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const fetchItems = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/clothing-items/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const formatted = data.map((item) => ({
        id: item.id,
        item_type: toTitleCase(item.item_type),
        color: toTitleCase(item.color),
        tag: tagMap[item.item_type] || "Others",
        image_url: item.image_url
          ? `${import.meta.env.VITE_BACKEND_URL}/static/uploads/${item.image_url}`
          : "/images/top-fallback.png",
        is_available: item.is_available,
      }));
      setItems(formatted);
    } catch {
      toast.error("Couldn't load items.");
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggleCheck = async (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_available: !item.is_available } : item,
      ),
    );
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/clothing-items/${id}/toggle-availability`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );
      if (!res.ok) throw new Error();
    } catch (err) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_available: !item.is_available } : item,
        ),
      );
      toast.error("Couldn't update.");
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/clothing-items/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEditingId(id);
      setShowModal(true);
      setPrefillData(data);
    } catch {
      toast.error("Couldn't load item.");
    }
  };

  const handleDelete = async (id) => {
    const removedItem = items.find((item) => item.id === id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/clothing-items/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );
      if (!res.ok) throw new Error();
    } catch (err) {
      setItems((prev) => [...prev, removedItem]);
      toast.error("Couldn't delete.");
    }
  };

  const handleAdd = () => {
    fetchItems();
  };

  return (
    <div className="home">
      <Header />
      <OutfitSection />
      <WardrobeSection
        items={items}
        onToggleCheck={handleToggleCheck}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <FloatingAddButton onClick={() => setShowModal(true)} />
      {showModal && (
        <AddItemModal
          onClose={() => {
            setShowModal(false);
            setEditingId(null);
            setPrefillData(null);
          }}
          onAdd={handleAdd}
          editId={editingId}
          prefillData={prefillData}
        />
      )}
    </div>
  );
};

export default Home;
