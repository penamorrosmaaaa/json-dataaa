import React from "react";
import { ChakraProvider, Box, Flex, Link } from "@chakra-ui/react";
import { BrowserRouter as Router, Route, Routes, Link as RouterLink } from "react-router-dom";
import RequestCountGraph from "./RequestCountGraph/RequestCountGraph";
import DataTable from "./DataTable/DataTable";
import General from "./General/General";
import NewPage from "./NewPage/NewPage";
import HomeAdmin from "./HomeAdmin/HomeAdmin"; // Import HomeAdmin component
import NewPageAdmin from "./NewPageAdmin/NewPageAdmin"; // Import NewPageAdmin component

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
          {/* Navigation Bar */}
          <Flex mb={8} gap={4}>
            <Link as={RouterLink} to="/" fontSize="lg" color="white" fontWeight="bold">
              Home
            </Link>
            <Link as={RouterLink} to="/new-page" fontSize="lg" color="white" fontWeight="bold">
              New Page
            </Link>
            <Link as={RouterLink} to="/home-admin" fontSize="lg" color="white" fontWeight="bold">
              Home Admin
            </Link>
            <Link as={RouterLink} to="/newpage-admin" fontSize="lg" color="white" fontWeight="bold">
              New Page Admin
            </Link>
          </Flex>

          <Routes>
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
            <Route path="/home-admin" element={<HomeAdmin />} /> {/* Add Home Admin route */}
            <Route path="/newpage-admin" element={<NewPageAdmin />} /> {/* Add New Page Admin route */}
          </Routes>
        </Box>
      </Router>
    </ChakraProvider>
  );
};

export default App;
