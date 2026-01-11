import { Navigate, Route, Routes } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import Book from "./routes/Book";
import Doctor from "./routes/Doctor";
import NotFound from "./routes/NotFound";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<Navigate to="/book" replace />} />
        <Route path="book" element={<Book />} />
        <Route path="doctor" element={<Doctor />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
