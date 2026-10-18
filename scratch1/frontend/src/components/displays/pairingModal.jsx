import { useState } from "react";
import "../../styles/displays.css";

function PairingModal({ isOpen, onClose, onPairSuccess }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function clearForm() {
    setCode("");
    setName("");
    setLocation("");
    setError("");
  }

  function handleCancel() {
    clearForm();
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!code.trim() || !name.trim() || !location.trim()) {
      setError("All fields are required");
      return;
    }

    try {
      await onPairSuccess({
        code: code.trim(),
        name: name.trim(),
        location: location.trim()
      });
      clearForm();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modalBackdrop">
      <div className="modalContent">
        <div className="modalHeader">
          <div>
            <p className="labelSmall">Administrator Side</p>
            <h2>Pair a Display</h2>
          </div>
          <button type="button" className="modalClose" onClick={handleCancel}>
             X 
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <p className="errorText">{error}</p>}

          <div className="field">
            <label className="labelSmall" htmlFor="pairCode">Pairing Code</label>
            <input
              id="pairCode"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="[ ABCD-1234 ]"
            />
          </div>

          <div className="field">
            <label className="labelSmall" htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=" Bulletin Board "
            />
          </div>

          <div className="field">
            <label className="labelSmall" htmlFor="displayLocation">Location</label>
            <input
              id="displayLocation"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder=" CCS "
            />
          </div>

          <div className="modalActions">
            <button type="button" className="btn" onClick={handleCancel}>
               Cancel 
            </button>
            <button type="submit" className="btn btnDark">
               Connect / Register 
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PairingModal;