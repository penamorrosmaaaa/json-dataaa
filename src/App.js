/* src/App.js */

import React from "react";
import { ChakraProvider, Box, Flex, Button } from "@chakra-ui/react";
import { BrowserRouter as Router, Routes, Route, Link as RouterLink, Navigate } from "react-router-dom";
import RequestCountGraph from "./RequestCountGraph/RequestCountGraph";
import DataTable from "./DataTable/DataTable";
import General from "./General/General"; // Import the General component

const App = () => {
  return (
    <ChakraProvider>
      <Router>
        <Box
          p={5}
          bg="radial-gradient(circle, #000000 0%, #7800ff 100%)"
          minH="100vh"
          color="white"
          display="flex"
          flexDirection="column"
          alignItems="center"
          overflow="hidden"
        >
          {/* Navigation Menu */}
          <Flex mb={10} gap={4}>
            <Button
              as={RouterLink}
              to="/graph"
              colorScheme="teal"
              variant="solid"
            >
              Request Count Graph
            </Button>
            <Button
              as={RouterLink}
              to="/table"
              colorScheme="teal"
              variant="solid"
            >
              Data Table
            </Button>
            <Button
              as={RouterLink}
              to="/general"
              colorScheme="teal"
              variant="solid"
            >
              General
            </Button>
          </Flex>

          {/* Define Routes */}
          <Routes>
            {/* Redirect root to /graph */}
            <Route path="/" element={<Navigate to="/graph" replace />} />
            <Route path="/graph" element={<RequestCountGraph />} />
            <Route path="/table" element={<DataTable />} />
            <Route path="/general" element={<General />} /> {/* New Route */}
            {/* Fallback route for undefined paths */}
            <Route path="*" element={<Navigate to="/graph" replace />} />
          </Routes>
        </Box>
      </Router>
    </ChakraProvider>
  );
};

export default App;
