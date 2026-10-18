import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:3000/api/pairing";

function TvDisplay() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("loading");
  const [screen, setScreen] = useState(null);

  async function getCode() {
    try {
      setStatus("loading");
      const response = await axios.post(`${API_URL}/code`);
      setCode(response.data.pairingCode);
      setStatus("pending");
    } catch (err) {
      setStatus("error");
    }
  }

  useEffect(() => {
    getCode();
  }, []);

  useEffect(() => {
    if (status !== "pending") return;

    const timer = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/status/${code}`);

        if (response.data.status === "claimed") {
          setScreen(response.data.screen);
          setStatus("claimed");
        } else if (response.data.status === "expired") {
          setStatus("expired");
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [status, code]);

  return (
    <div className="tvPage">
      <div className="tvHeader">Campus Bulletin Board</div>

      <div className="tvBody">
        {status === "loading" && <p className="tvWaiting"> Getting a pairing code... </p>}

        {status === "pending" && (
          <>
            <h1 className="tvTitle">Display Not Registered</h1>
            <p className="labelSmall">Pairing Code</p>
            <div className="tvCodeBox">{code}</div>
            <p className="tvHint">
              Enter this code in the
              <br />
              Administrator dashboard.
            </p>
            <div className="tvDivider"></div>
            <p className="tvWaiting"> Waiting for administrator registration... </p>
          </>
        )}

        {status === "claimed" && screen && (
          <>
            <h1 className="tvTitle">Display Registered</h1>
            <p className="labelSmall">Display Name</p>
            <div className="tvCodeBox tvNameBox">{screen.name}</div>
            <p className="tvHint">{screen.location}</p>
            <div className="tvDivider"></div>
            <p className="tvWaiting"> Paired successfully </p>
          </>
        )}

        {status === "expired" && (
          <>
            <h1 className="tvTitle">Code Expired</h1>
            <button className="btn btnDark" onClick={getCode}>
               Get a new code 
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="tvTitle">Cannot Reach Server</h1>
            <button className="btn btnDark" onClick={getCode}>
               Try again 
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default TvDisplay;