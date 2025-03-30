import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { NavMenu } from "./components/ui/nav-menu";

import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin-page";
import AuthPage from "@/pages/auth-page";
import MenteeDashboard from "@/pages/mentee-dashboard";
import MentorDashboard from "@/pages/mentor-dashboard";
import ProfilePage from "@/pages/profile-page";
import LiveChatPage from "@/pages/message-page";

function Router() {
  return (
    <Switch>
      {/* Exact route for '/profile' - for user profile */}
      <ProtectedRoute exact path="/profile" component={ProfilePage} />
      
      {/* Route for '/profile/:id' - for specific profile with ID */}
      <ProtectedRoute path="/profile/:id" component={ProfilePage} />

      <ProtectedRoute exact path="/" component={MenteeDashboard} roles={["mentee"]} />
      <ProtectedRoute exact path="/mentor" component={MentorDashboard} roles={["mentor"]} />

      <ProtectedRoute exact path="/message" component={LiveChatPage} />

      <Route path="/auth" component={AuthPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavMenu />
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
