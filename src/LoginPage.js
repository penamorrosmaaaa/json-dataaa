// src/LoginPage.js
import React, { useState } from 'react';
import { Box, Button, Input, Text, VStack, Flex } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    // Predefined users
    const users = [
      { username: 'manuel', password: '12345' },
      { username: 'Gudiño', password: '12345' },
    ];

    // Check if entered credentials match any user
    const user = users.find(
      (user) => user.username === username && user.password === password
    );

    if (user) {
      onLogin();
      navigate('/home-admin');
    } else {
      alert('Invalid Username or Password');
    }
  };

  return (
    <Flex
      height="100vh"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        p={8}
        maxWidth="400px"
        borderWidth={1}
        borderRadius={8}
        boxShadow="lg"
        bg="gray.800"
      >
        <VStack spacing={4}>
          <Text fontSize="2xl" color="white">Admin Login</Text>
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
          />
          <Input
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
          <Button colorScheme="purple" width="full" onClick={handleLogin}>
            Login
          </Button>
        </VStack>
      </Box>
    </Flex>
  );
};

export default LoginPage;
