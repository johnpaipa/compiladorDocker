import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import AssessmentList from './pages/AssessmentList';
import AssessmentDetail from './pages/AssessmentDetail';
import CodeEditor from './pages/CodeEditor';
import Results from './pages/Results';
import AdminAssessments from './pages/AdminAssessments';
import AdminAssessmentDetail from './pages/AdminAssessmentDetail';
import AdminUsers from './pages/AdminUsers';
import QuestionForm from './pages/QuestionForm';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<AssessmentList />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="/questions/:questionId/solve" element={<CodeEditor />} />
            <Route path="/results/:assessmentId/:userId" element={<Results />} />
            <Route path="/account" element={<Account />} />
          </Route>

          <Route element={<RequireAuth roles={['ADMIN', 'EVALUATOR']} />}>
            <Route path="/admin" element={<AdminAssessments />} />
            <Route path="/admin/assessments/:id" element={<AdminAssessmentDetail />} />
            <Route path="/admin/assessments/:assessmentId/questions/new" element={<QuestionForm />} />
            <Route path="/admin/questions/:questionId/edit" element={<QuestionForm />} />
          </Route>

          <Route element={<RequireAuth roles={['ADMIN']} />}>
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
