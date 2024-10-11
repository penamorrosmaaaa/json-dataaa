// src/App.js
import React, { useState, useEffect } from "react";
import { ChakraProvider, Box, Flex, Link, Button } from "@chakra-ui/react";
import { BrowserRouter as Router, Route, Routes, Link as RouterLink, Navigate } from "react-router-dom";
import RequestCountGraph from "./RequestCountGraph/RequestCountGraph";
import DataTable from "./DataTable/DataTable";
import General from "./General/General";
import NewPage from "./NewPage/NewPage";
import HomeAdmin from "./HomeAdmin/HomeAdmin";
import NewPageAdmin from "./NewPageAdmin/NewPageAdmin";
import LoginPage from "./LoginPage";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Optional: Persist authentication state using localStorage
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true'); // Optional
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated'); // Optional
  };

  return (
    <ChakraProvider>
      <Router>
        <Box
          p={5}
          bg="linear-gradient(90deg, #000000, #7800ff)"
          minH="100vh"
          color="white"
          display="flex"
          flexDirection="column"
          alignItems="center"
          overflow="auto"
          width="100%"
        >
          {/* Navigation Bar */}
          <Flex mb={8} gap={4}>
            <Link as={RouterLink} to="/" fontSize="lg" color="white" fontWeight="bold">
              Home
            </Link>
            <Link as={RouterLink} to="/new-page" fontSize="lg" color="white" fontWeight="bold">
              New Page
            </Link>
            {isAuthenticated && (
              <>
                <Link as={RouterLink} to="/home-admin" fontSize="lg" color="white" fontWeight="bold">
                  Home Admin
                </Link>
                <Link as={RouterLink} to="/newpage-admin" fontSize="lg" color="white" fontWeight="bold">
                  New Page Admin
                </Link>
                <Button onClick={handleLogout} colorScheme="red" variant="outline">
                  Logout
                </Button>
              </>
            )}
            {!isAuthenticated && (
              <Link as={RouterLink} to="/login" fontSize="lg" color="white" fontWeight="bold">
                Login
              </Link>
            )}
          </Flex>

          <Routes>
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/home-admin" /> : <LoginPage onLogin={handleLogin} />
            } />
            <Route path="/" element={
              <>
                <Box width="100%" maxW="1200px" borderRadius="md" p={6} mb={0}>
                  <General />
                </Box>
                <Box
                  width="100%"
                  maxW="1600px"
                  borderRadius="md"
                  p={6}
                  mb={10}
                  position="relative"
                  overflow="hidden"
                >
                  <RequestCountGraph />
                </Box>
                <Box
                  width="100%"
                  maxW="1500px"
                  borderRadius="md"
                  p={6}
                  mb={50}
                  position="relative"
                  zIndex={2}
                >
                  <DataTable />
                </Box>
              </>
            }/>
            <Route path="/new-page" element={<NewPage />} />
            <Route path="/home-admin" element={
              isAuthenticated ? <HomeAdmin /> : <Navigate to="/login" />
            } />
            <Route path="/newpage-admin" element={
              isAuthenticated ? <NewPageAdmin /> : <Navigate to="/login" />
            } />
            {/* Redirect any unknown routes to Home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Box>
      </Router>
    </ChakraProvider>
  );
};

export default App;
