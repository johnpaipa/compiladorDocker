import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AssessmentList from './pages/AssessmentList';
import AssessmentDetail from './pages/AssessmentDetail';
import CodeEditor from './pages/CodeEditor';
import Results from './pages/Results';
import AdminAssessments from './pages/AdminAssessments';
import AdminAssessmentDetail from './pages/AdminAssessmentDetail';
import QuestionForm from './pages/QuestionForm';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AssessmentList />} />
          <Route path="/assessments/:id" element={<AssessmentDetail />} />
          <Route path="/questions/:questionId/solve" element={<CodeEditor />} />
          <Route path="/results/:assessmentId/:candidateId" element={<Results />} />
          <Route path="/admin" element={<AdminAssessments />} />
          <Route path="/admin/assessments/:id" element={<AdminAssessmentDetail />} />
          <Route path="/admin/assessments/:assessmentId/questions/new" element={<QuestionForm />} />
          <Route path="/admin/questions/:questionId/edit" element={<QuestionForm />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
