import React, { useState, useEffect } from 'react';
import { Box, Text, Button, Link } from '@chakra-ui/react';

const HomeAdmin = () => {
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
    <Box p={0} width="100vw" height="100vh">
      <Text fontSize="2xl" fontWeight="bold" p={5} bg="gray.800" color="white">
        Home Admin
      </Text>
      
      {/* Embed Google Sheet */}
      <Box 
        width="100%" 
        height={isFullScreen ? "100vh" : "calc(100vh - 140px)"}
        position={isFullScreen ? "fixed" : "relative"}
        top={isFullScreen ? "0" : "auto"}
        left={isFullScreen ? "0" : "auto"}
        zIndex={isFullScreen ? "1000" : "auto"}
        bg="white"
      >
        <iframe 
          src="https://docs.google.com/spreadsheets/d/1I7rzIKf_CNjdP1iYGHivom5eS8YtGlSaP7ltG-HVw3w/edit?usp=sharing"
          width="100%" 
          height="100%" 
          style={{ border: "0" }}
          allowFullScreen
        ></iframe>
        
        {/* Full-Screen Toggle Button */}
        <Button 
          position="absolute" 
          top="10px" 
          right="10px" 
          zIndex="1100" 
          colorScheme="teal"
          onClick={toggleFullScreen}
        >
          {isFullScreen ? "Exit Full Screen" : "Full Screen"}
        </Button>
      </Box>

      {/* Button for Google Drive Folder */}
      {!isFullScreen && (
        <Box p={5} textAlign="center" bg="gray.800" color="white">
          <Text fontSize="lg" mb={2}>Access Google Drive Folder:</Text>
          <Link 
            href="https://drive.google.com/drive/u/0/folders/1qZP_dE9Hk7QTjSaf3hQPqHjgKbVHOGk5" 
            isExternal
          >
            <Button colorScheme="teal">Open Google Drive</Button>
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default HomeAdmin;
