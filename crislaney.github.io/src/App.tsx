import React from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom'; 

import MultiSearch from './components/MultiSearch';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/multisearch"/>} />
        <Route path="/multisearch" element={ <MultiSearch /> } />
      </Routes>
    </Router>
  );
}

export default App;