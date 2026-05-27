import { Navigate, Route, Routes } from "react-router-dom";
import Cardapio from "./pages/Cardapio";
import Admin from "./pages/Admin";
import Motoboy from "./pages/Motoboy";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/cardapio" replace />} />
      <Route path="/cardapio" element={<Cardapio />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/motoboy" element={<Motoboy />} />
    </Routes>
  );
}