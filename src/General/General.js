/* src/components/General/General.js */

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Button,
} from "@chakra-ui/react";
import Papa from "papaparse";

// Utility function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0 || previous === null) return "N/A";
  const change = ((current - previous) / previous) * 100;
  return change.toFixed(2);
};

// Utility function to get ISO week number (not used here but kept for reference)
const getWeekNumber = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};

const General = () => {
  // State variables
  const [totalData, setTotalData] = useState([]);
  const [envivoData, setEnvivoData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparisonMode, setComparisonMode] = useState("percentage"); // 'percentage' or 'raw'

  // Fetch and parse CSV data
  useEffect(() => {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVHwv5X6-u3M7f8HJNih14hSnVpBlNKFUe_O76bTUJ2PaaOAfrqIrwjWsyc9DNFKxcYoEsWutl1_K6/pub?output=csv";

    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData = results.data;

          // Debug: Log first few rows to verify data
          console.log("Parsed CSV Data Sample:", parsedData.slice(0, 5));

          // Process total request counts per day
          const totalRequestsMap = {};
          const envivoRequestsMap = {};

          parsedData.forEach((row, index) => {
            const date = row["Date"]?.trim();
            const object = row["Object"]?.trim();
            const requestCountStr = row["Request Count"]?.trim();
            const requestCount = parseInt(requestCountStr, 10);

            if (!date || isNaN(requestCount)) {
              console.warn(`Skipping row ${index + 2} due to missing date or request count.`);
              return;
            }

            // Aggregate total requests
            if (!totalRequestsMap[date]) {
              totalRequestsMap[date] = 0;
            }
            totalRequestsMap[date] += requestCount;

            // Aggregate envivo query requests
            // Ensure exact match with leading slash
            if (object.toLowerCase() === "/envivo/query") {
              if (!envivoRequestsMap[date]) {
                envivoRequestsMap[date] = 0;
              }
              envivoRequestsMap[date] += requestCount;
            }
          });

          // Convert maps to sorted arrays
          const sortedDates = Object.keys(totalRequestsMap).sort(
            (a, b) => new Date(a) - new Date(b)
          );

          const totalRequestsData = sortedDates.map((date) => ({
            date,
            totalRequests: totalRequestsMap[date],
          }));

          const envivoRequestsData = sortedDates.map((date) => ({
            date,
            envivoRequests: envivoRequestsMap[date] || 0,
          }));

          setTotalData(totalRequestsData);
          setEnvivoData(envivoRequestsData);
          setIsLoading(false);
        } catch (err) {
          console.error("Error processing CSV data:", err);
          setError("Failed to process data.");
          setIsLoading(false);
        }
      },
      error: (err) => {
        console.error("Error fetching CSV data:", err);
        setError("Failed to fetch data.");
        setIsLoading(false);
      },
    });
  }, []);

  // Find the previous same day
  const findPreviousSameDay = (currentDate, dataArray) => {
    const current = new Date(currentDate);
    const previousDate = new Date(current);
    previousDate.setDate(current.getDate() - 7);
    const formattedDate = previousDate.toISOString().split("T")[0];
    const previousData = dataArray.find((d) => d.date === formattedDate);
    return previousData ? previousData.totalRequests : null;
  };

  // Calculate changes for Total Requests
  const currentTotalRequest = useMemo(() => {
    if (totalData.length === 0) return null;
    return totalData[totalData.length - 1].totalRequests;
  }, [totalData]);

  const previousTotalRequest = useMemo(() => {
    if (!currentTotalRequest) return null;
    const currentDate = totalData[totalData.length - 1].date;
    return findPreviousSameDay(currentDate, totalData);
  }, [totalData, currentTotalRequest]);

  const totalRequestChange = useMemo(() => {
    if (previousTotalRequest === null) return "N/A";
    const change = currentTotalRequest - previousTotalRequest;
    return change;
  }, [currentTotalRequest, previousTotalRequest]);

  const totalPercentageChange = useMemo(() => {
    if (previousTotalRequest === null) return "N/A";
    return calculatePercentageChange(currentTotalRequest, previousTotalRequest);
  }, [currentTotalRequest, previousTotalRequest]);

  // Calculate changes for Envivo Query
  const currentEnvivoRequest = useMemo(() => {
    if (envivoData.length === 0) return null;
    return envivoData[envivoData.length - 1].envivoRequests;
  }, [envivoData]);

  const previousEnvivoRequest = useMemo(() => {
    if (!currentEnvivoRequest) return null;
    const currentDate = envivoData[envivoData.length - 1].date;
    return findPreviousSameDay(currentDate, envivoData);
  }, [envivoData, currentEnvivoRequest]);

  const envivoRequestChange = useMemo(() => {
    if (previousEnvivoRequest === null) return "N/A";
    const change = currentEnvivoRequest - previousEnvivoRequest;
    return change;
  }, [currentEnvivoRequest, previousEnvivoRequest]);

  const envivoPercentageChange = useMemo(() => {
    if (previousEnvivoRequest === null) return "N/A";
    return calculatePercentageChange(currentEnvivoRequest, previousEnvivoRequest);
  }, [currentEnvivoRequest, previousEnvivoRequest]);

  // Toggle comparison mode
  const toggleComparisonMode = () => {
    setComparisonMode((prev) => (prev === "percentage" ? "raw" : "percentage"));
  };

  return (
    <Box
      p={5}
      bg="rgba(0, 0, 0, 0)"
      minH="100vh"
      color="white"
      display="flex"
      flexDirection="column"
      alignItems="center"
      overflow="hidden"
      width="100%"
    >
      {/* Header */}
      <Text fontSize="3xl" mb={10}>
        General Overview
      </Text>

      {isLoading ? (
        <Flex justifyContent="center" alignItems="center" height="50vh">
          <Spinner size="xl" color="teal.500" />
          <Text ml={4} fontSize="xl">
            Loading data...
          </Text>
        </Flex>
      ) : error ? (
        <Text color="red.500" fontSize="xl">
          {error}
        </Text>
      ) : (
        <Flex
          direction={{ base: "column", md: "row" }}
          gap={10}
          width="100%"
          maxW="800px"
          justifyContent="center"
        >
          {/* Daily Request Count Box */}
          <Box
            bg="rgba(255, 255, 255, 0.1)"
            borderRadius="md"
            p={6}
            boxShadow="lg"
            flex="1"
          >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Text fontSize="2xl">Daily Request Count</Text>
              <Button onClick={toggleComparisonMode} colorScheme="teal" size="sm">
                Show {comparisonMode === "percentage" ? "Raw" : "Percentage"}
              </Button>
            </Flex>
            <Flex direction="column" alignItems="center">
              <Text fontSize="4xl" fontWeight="bold">
                {currentTotalRequest !== null ? currentTotalRequest.toLocaleString() : "N/A"}
              </Text>
              <Flex alignItems="center" mt={2}>
                {comparisonMode === "percentage" ? (
                  <>
                    <Text
                      fontSize="lg"
                      color={totalPercentageChange >= 0 ? "green.400" : "red.400"}
                      mr={2}
                    >
                      {totalPercentageChange === "N/A" ? "N/A" : `${totalPercentageChange}%`}
                    </Text>
                    <Text fontSize="md">compared to last week</Text>
                  </>
                ) : (
                  <>
                    <Text
                      fontSize="lg"
                      color={totalRequestChange >= 0 ? "green.400" : "red.400"}
                      mr={2}
                    >
                      {totalRequestChange === "N/A"
                        ? "N/A"
                        : `${totalRequestChange >= 0 ? "+" : ""}${totalRequestChange}`}
                    </Text>
                    <Text fontSize="md">compared to last week</Text>
                  </>
                )}
              </Flex>
            </Flex>
          </Box>

          {/* Daily Envivo Query Count Box */}
          <Box
            bg="rgba(255, 255, 255, 0.1)"
            borderRadius="md"
            p={6}
            boxShadow="lg"
            flex="1"
          >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Text fontSize="2xl">Daily Envivo Query Count</Text>
              <Button onClick={toggleComparisonMode} colorScheme="teal" size="sm">
                Show {comparisonMode === "percentage" ? "Raw" : "Percentage"}
              </Button>
            </Flex>
            <Flex direction="column" alignItems="center">
              <Text fontSize="4xl" fontWeight="bold">
                {currentEnvivoRequest !== null
                  ? currentEnvivoRequest.toLocaleString()
                  : "N/A"}
              </Text>
              <Flex alignItems="center" mt={2}>
                {comparisonMode === "percentage" ? (
                  <>
                    <Text
                      fontSize="lg"
                      color={envivoPercentageChange >= 0 ? "green.400" : "red.400"}
                      mr={2}
                    >
                      {envivoPercentageChange === "N/A"
                        ? "N/A"
                        : `${envivoPercentageChange}%`}
                    </Text>
                    <Text fontSize="md">compared to last week</Text>
                  </>
                ) : (
                  <>
                    <Text
                      fontSize="lg"
                      color={envivoRequestChange >= 0 ? "green.400" : "red.400"}
                      mr={2}
                    >
                      {envivoRequestChange === "N/A"
                        ? "N/A"
                        : `${envivoRequestChange >= 0 ? "+" : ""}${envivoRequestChange}`}
                    </Text>
                    <Text fontSize="md">compared to last week</Text>
                  </>
                )}
              </Flex>
            </Flex>
          </Box>
        </Flex>
      )}
    </Box>
  );
};

export default General;
