import { useState, useRef, useEffect } from "react";
import "./ItemModal.css";
import { FadeLoader } from "react-spinners";
import toast from "react-hot-toast";

const AddItemModal = ({ onClose, onAdd, editId, prefillData }) => {
  const [type, setType] = useState("");
  const [color, setColor] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const previousUrl = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (prefillData) {
      setType(prefillData.item_type || "");
      setColor(prefillData.color || "");
      setImagePreview(
        prefillData.image_url
          ? `${import.meta.env.VITE_BACKEND_URL}/static/uploads/${prefillData.image_url}`
          : null,
      );
    }
  }, [prefillData]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (previousUrl.current) URL.revokeObjectURL(previousUrl.current);
    const localUrl = URL.createObjectURL(file);
    previousUrl.current = localUrl;
    setImagePreview(localUrl);
    const formData = new FormData();
    formData.append("image", file);
    const format = (text) =>
      text
        ?.replace(/[_-]/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    try {
      setLoadingAI(true);
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/clothing-items/analyze-image`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );
      if (!res.ok) throw new Error();
      const detectedType = res.headers.get("Item-Type");
      const detectedColor = res.headers.get("Color");
      if (detectedType) setType(format(detectedType));
      if (detectedColor) setColor(format(detectedColor));
      const blob = await res.blob();
      if (previousUrl.current) URL.revokeObjectURL(previousUrl.current);
      const aiUrl = URL.createObjectURL(blob);
      previousUrl.current = aiUrl;
      setImagePreview(aiUrl);
    } catch {
      toast.error("Analysis failed.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!type.trim() || !color.trim()) return;
    const formData = new FormData();
    formData.append("item_type", type.trim());
    formData.append("color", color.trim());
    formData.append("is_available", true);
    if (selectedFile) formData.append("image", selectedFile);
    try {
      const url = editId
        ? `${import.meta.env.VITE_BACKEND_URL}/clothing-items/${editId}`
        : `${import.meta.env.VITE_BACKEND_URL}/clothing-items/`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!res.ok) throw new Error();
      onAdd();
      onClose();
    } catch {
      toast.error(editId ? "Couldn't update" : "Couldn't add item");
    }
  };

  const isValid = type.trim() && color.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{editId ? "Edit Item" : "Add Wardrobe Item"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="modal-image-upload">
            <div
              className="modal-image-preview"
              onClick={() => fileInputRef.current?.click()}
            >
              {loadingAI ? (
                <div className="modal-loader">
                  <FadeLoader height={8} width={3} radius={6} margin={2} />
                  <span>Analyzing...</span>
                </div>
              ) : imagePreview ? (
                <img src={imagePreview} alt="Preview" />
              ) : (
                <div className="modal-image-placeholder">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Click to upload image</span>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              hidden
            />
          </div>
          <div className="modal-field">
            <label>Type</label>
            <input
              type="text"
              placeholder="e.g. Shirt, Hoodie, Kurta"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </div>
          <div className="modal-field">
            <label>Color</label>
            <input
              type="text"
              placeholder="e.g. Navy Blue"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn submit"
              disabled={!isValid}
            >
              {editId ? "Edit Item" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
