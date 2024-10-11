import React from 'react';
import { Box, Text } from '@chakra-ui/react';

const NewPageAdmin = () => {
  return (
    <Box p={5} color="white">
      <Text fontSize="2xl" fontWeight="bold">New Page Admin</Text>
      <Text mb={5}>Manage the New Page content here.</Text>
      
      {/* Embed Google Sheet */}
      <Box p={3} bg="gray.900" borderRadius="md" width="100vw" maxW="100vw">
        <iframe 
          src="https://docs.google.com/spreadsheets/d/1oaMzcoyGzpY8Wg8EL8wlLtb4OHWzExOu/edit?usp=sharing"
          width="100%" 
          height="800px" 
          style={{ border: "0" }}
          allowFullScreen
        ></iframe>
      </Box>
    </Box>
  );
};

export default NewPageAdmin;