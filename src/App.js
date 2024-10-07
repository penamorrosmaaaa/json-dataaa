import React from "react";
import { ChakraProvider, Box } from "@chakra-ui/react";
import RequestCountGraph from "./RequestCountGraph/RequestCountGraph";
import DataTable from "./DataTable/DataTable";
import General from "./General/General";

const App = () => {
  return (
    <ChakraProvider>
      <Flex
  p={5}
  bg="linear-gradient(90deg, #000000, #7800ff)"
  minH="100vh" // Full viewport height to prevent cutoff
  color="white"
  direction="column"
  align="center"
  width="100%"
  overflow="hidden" // Removes scrolling and keeps within viewport
>

        {/* General Overview Section */}
        <Box
          width="100%"
          maxW="1200px"
          borderRadius="md"
          p={6}
          mb={0}
        >
          <General />
        </Box>

        {/* Request Count Graph Section */}
        <Box
  width="100%"
  maxW="1600px"
  borderRadius="md"
  p={6}
  mb={10} // Increased bottom margin to space out components
  position="relative" 
  overflow="hidden" // Prevent any overflow from the graph section
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
  maxH="400px" // Set a maximum height to limit DataTable height
  overflowY="scroll" // Allow vertical scrolling for overflow content
  zIndex={1} // Ensure DataTable is on top if it overlaps
>
  <DataTable />
</Box>

      </Box>
    </ChakraProvider>
  );
};

export default App;
