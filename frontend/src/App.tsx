import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AssessmentList from './pages/AssessmentList';
import AssessmentDetail from './pages/AssessmentDetail';
import CodeEditor from './pages/CodeEditor';
import Results from './pages/Results';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AssessmentList />} />
        <Route path="/assessments/:id" element={<AssessmentDetail />} />
        <Route path="/questions/:questionId/solve" element={<CodeEditor />} />
        <Route path="/results/:assessmentId/:candidateId" element={<Results />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;