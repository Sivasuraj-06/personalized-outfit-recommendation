import "./FloatingAddButton.css";

const FloatingAddButton = ({ onClick }) => {
  return (
    <button className="fab" onClick={onClick} aria-label="Add item">
      +
    </button>
  );
};

export default FloatingAddButton;
