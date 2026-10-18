import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Displays from "./pages/displays";
import TvDisplay from "./pages/tvDisplays";
import "./styles/App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/displays" element={<Displays />} />
        <Route path="/tv" element={<TvDisplay />} />
        <Route path="*" element={<Navigate to="/displays" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;