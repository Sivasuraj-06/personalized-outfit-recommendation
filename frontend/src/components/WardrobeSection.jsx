import { useState } from "react";
import "./WardrobeSection.css";

const WardrobeSection = ({ items, onToggleCheck, onEdit, onDelete }) => {
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState([]);

  const tags = ["Shirts", "Pants", "Others"];

  const toggleTag = (tag) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const filtered = items.filter((item) => {
    const matchSearch =
      item.item_type.toLowerCase().includes(search.toLowerCase()) ||
      item.color.toLowerCase().includes(search.toLowerCase());
    const matchTag = activeTags.length === 0 || activeTags.includes(item.tag);
    return matchSearch && matchTag;
  });

  return (
    <section className="wardrobe-section">
      <div className="wardrobe-search">
        <input
          type="text"
          placeholder="Search wardrobe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="wardrobe-tags">
        {tags.map((tag) => (
          <button
            key={tag}
            className={`wardrobe-tag ${activeTags.includes(tag) ? "active" : ""}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="wardrobe-list">
        {filtered.length === 0 ? (
          <div className="wardrobe-empty">No items found</div>
        ) : (
          filtered.map((item) => (
            <div className="wardrobe-item" key={item.id}>
              <input
                type="checkbox"
                className="wardrobe-checkbox"
                checked={item.is_available}
                onChange={() => onToggleCheck(item.id)}
              />
              <img
                className="wardrobe-item-img"
                src={item.image_url}
                alt={item.item_type}
              />
              <div className="wardrobe-item-info">
                <span>
                  <strong>TYPE:</strong> {item.item_type}
                </span>
                <span>
                  <strong>COLOR:</strong> {item.color}
                </span>
              </div>
              <div className="wardrobe-item-actions">
                <button
                  className="wardrobe-action-btn"
                  aria-label="Edit"
                  onClick={() => onEdit(item.id)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="wardrobe-action-btn delete"
                  aria-label="Delete"
                  onClick={() => onDelete(item.id)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default WardrobeSection;
