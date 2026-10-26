import { useState, useEffect } from "react";
import axios from "axios";
import PairingModal from "../components/displays/pairingModal";

const API_URL = `http://${window.location.hostname}:3000/api`;

function Displays() {
  const [screens, setScreens] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");

  useEffect(() => {
    loadScreens();
  }, []);

  async function loadScreens() {
    try {
      const response = await axios.get(`${API_URL}/screens?t=${Date.now()}`);
      setScreens([...response.data].reverse());
    } catch (err) {
      setError("Could not load displays.");
    }
  }

  async function handlePair(data) {
    setMessage("");
    setError("");

    try {
      await axios.post(`${API_URL}/pairing/pair`, data);
    } catch (err) {
      if (err.response) {
        throw new Error(err.response.data.message);
      }
      throw new Error("Could not reach the server.");
    }

    setIsModalOpen(false);
    setMessage("TV added successfully");
    await loadScreens();
  }

  async function handleSave(id) {
    setMessage("");
    setError("");

    try {
      const response = await axios.patch(`${API_URL}/screens/${id}`, {
        name: editName,
        location: editLocation
      });

      setMessage(response.data.message);
      setEditingId(null);
      loadScreens();
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message);
      } else {
        setError("Could not reach the server.");
      }
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this display?")) return;

    setMessage("");
    setError("");

    try {
      const response = await axios.delete(`${API_URL}/screens/${id}`);
      setMessage(response.data.message);
      loadScreens();
    } catch (err) {
      setError("Could not delete the display.");
    }
  }

  return (
    <div className="adminPage">
      <h1>Displays</h1>

      <button className="btn btnDark" onClick={() => setIsModalOpen(true)}>
         Pair New Display
      </button>

      {message && <p className="success">{message}</p>}
      {error && <p className="errorText">{error}</p>}

      <hr />

      <p className="labelSmall">Registered Displays ({screens.length})</p>

      {screens.length === 0 && <p>No displays registered yet.</p>}

      {screens.map((screen) => (
        <div key={screen.id} className="screenCard">
          {editingId === screen.id ? (
            <div className="editForm">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Display name"
              />
              <input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Location"
              />
              <div className="cardActions">
                <button className="btn btnDark" onClick={() => handleSave(screen.id)}>
                  Save
                </button>
                <button className="btn" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3>{screen.name}</h3>
              <p>Location: {screen.location}</p>
              <p>Status: {screen.status}</p>
              <div className="cardActions">
                <button
                  className="btn"
                  onClick={() => {
                    setEditingId(screen.id);
                    setEditName(screen.name);
                    setEditLocation(screen.location);
                  }}
                >
                  Edit
                </button>
                <button className="btn btnDanger" onClick={() => handleDelete(screen.id)}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <PairingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPairSuccess={handlePair}
      />
    </div>
  );
}

export default Displays;