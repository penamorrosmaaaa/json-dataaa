import React, { useState } from 'react';
import { Box, Text, Input, Table, Thead, Tbody, Tr, Th, Td } from '@chakra-ui/react';
import Papa from 'papaparse';

const HomeAdmin = () => {
  const [data, setData] = useState([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => {
          const csvData = result.data;

          // Extract and format date (only first 10 characters in full YYYY-MM-DD format)
          const rawDate = csvData[3][1];
          const formattedDate = rawDate ? rawDate.substring(0, 10) : '';

          // Extract C9 to C58 and D9 to D58
          const c9ToC58 = csvData.slice(8, 58).map(row => row[2]);
          const d9ToD58 = csvData.slice(8, 58).map(row => row[3]);

          const formattedData = c9ToC58.map((cValue, index) => ({
            date: formattedDate,
            columnC: cValue,
            columnD: d9ToD58[index]
          }));

          setData(formattedData);
        },
      });
    }
  };

  return (
    <Box p={0} width="100vw" height="100vh">
      <Text fontSize="2xl" fontWeight="bold" p={5} bg="gray.800" color="white">
        Home Admin
      </Text>
      
      {/* Embed Google Sheet */}
      <Box width="100%" height="calc(100vh - 72px)">
        <iframe 
          src="https://docs.google.com/spreadsheets/d/1I7rzIKf_CNjdP1iYGHivom5eS8YtGlSaP7ltG-HVw3w/edit?usp=sharing"
          width="100%" 
          height="100%" 
          style={{ border: "0" }}
          allowFullScreen
        ></iframe>
      </Box>
      
      {/* Converter Helper Section */}
      <Box p={5} mt={5} borderWidth="1px" borderRadius="lg" bg="white">
        <Input type="file" accept=".csv" onChange={handleFileUpload} mb={5} />
        <Table variant="simple" colorScheme="blackAlpha" style={{ fontFamily: 'Arial', color: 'black' }}>
          <Thead>
            <Tr>
              <Th color="black">Date</Th>
              <Th color="black">C9 to C58</Th>
              <Th color="black">D9 to D58</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.map((row, index) => (
              <Tr key={index}>
                <Td>{row.date}</Td>
                <Td>{row.columnC}</Td>
                <Td>{row.columnD}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default HomeAdmin;