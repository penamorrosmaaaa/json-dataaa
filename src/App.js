/* src/App.js */

import React from "react";
import { ChakraProvider, Box } from "@chakra-ui/react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import RequestCountGraph from "./RequestCountGraph/RequestCountGraph";
import DataTable from "./DataTable/DataTable";
import General from "./General/General";
import NewPage from "./NewPage/NewPage"; // Import the new page component

const App = () => {
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
          <Routes>
            <Route
              path="/"
              element={
                <>
                  {/* General Overview Section */}
                  <Box width="100%" maxW="1200px" borderRadius="md" p={6} mb={0}>
                    <General />
                  </Box>

                  {/* Request Count Graph Section */}
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

                  {/* Data Table Section */}
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
              }
            />
            <Route path="/new-page" element={<NewPage />} /> {/* Add the new page route */}
          </Routes>
        </Box>
      </Router>
    </ChakraProvider>
  );
};

export default App;
