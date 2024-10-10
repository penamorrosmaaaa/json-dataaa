import React from 'react';
import { Box, Text } from '@chakra-ui/react';

const HomeAdmin = () => {
  return (
    <Box p={0} color="white" width="100vw" height="100vh">
      <Text fontSize="2xl" fontWeight="bold" p={5} bg="gray.800">
        Home Admin
      </Text>
      
      {/* Embed Google Sheet */}
      <Box width="100%" height="calc(100vh - 72px)"> {/* Adjust for the header height */}
        <iframe 
          src="https://docs.google.com/spreadsheets/d/1I7rzIKf_CNjdP1iYGHivom5eS8YtGlSaP7ltG-HVw3w/edit?usp=sharing"
          width="100%" 
          height="100%" 
          style={{ border: "0" }}
          allowFullScreen
        ></iframe>
      </Box>
    </Box>
  );
};

export default HomeAdmin;
