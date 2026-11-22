import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login_page from './Login_page';
import Home from './Home';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>} />
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;
