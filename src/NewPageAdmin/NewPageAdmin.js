import React, { useState, useEffect } from 'react';
import { Box, Text, Button } from '@chakra-ui/react';

const NewPageAdmin = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Lock scrolling when in fullscreen mode
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden"; // Prevents scrolling on the page
    } else {
      document.body.style.overflow = "auto"; // Restores scrolling when not fullscreen
    }

    return () => {
      document.body.style.overflow = "auto"; // Ensure scrolling is restored if component unmounts
    };
  }, [isFullScreen]);

  return (
    <Box color="white" width="100vw" height="100vh" p={0} m={0}>
      <Text fontSize="2xl" fontWeight="bold" p={5} bg="gray.800">
        New Page Admin
      </Text>
      <Text mb={5} p={5}>
        Manage the New Page content here.
      </Text>
      
      {/* Full-Screen Toggle Button */}
      <Button 
        position="fixed" 
        top="10px" 
        right="10px" 
        zIndex="1100" 
        colorScheme="teal"
        onClick={toggleFullScreen}
      >
        {isFullScreen ? "Exit Full Screen" : "Full Screen"}
      </Button>

      {/* Embed Google Sheet */}
      <Box 
        bg="gray.900" 
        width="100vw" 
        height={isFullScreen ? "100vh" : "800px"} 
        position={isFullScreen ? "fixed" : "relative"}
        top={isFullScreen ? "0" : "auto"}
        left={isFullScreen ? "0" : "auto"}
        zIndex={isFullScreen ? "1000" : "auto"}
        p={0} 
        m={0} 
        overflow="hidden"
      >
        <iframe 
          src="https://docs.google.com/spreadsheets/d/1oaMzcoyGzpY8Wg8EL8wlLtb4OHWzExOu/edit?usp=sharing"
          width="100%" 
          height="100%" 
          style={{ border: "0" }}
          allowFullScreen
        ></iframe>
      </Box>
    </Box>
  );
};

export default NewPageAdmin;
