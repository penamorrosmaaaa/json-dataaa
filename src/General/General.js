// src/components/General/General.js

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Button,
  Select,
  Grid,
} from "@chakra-ui/react";
import Papa from "papaparse";

// Define the time periods
const PERIODS = {
  CURRENT_WEEK: "Current Week",
  CURRENT_MONTH: "Current Month",
  CURRENT_YEAR: "Current Year",
  ALL_TIME: "All-Time",
};

// Helper function to get the start of the week (Monday)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
};

// Helper function to get the end of the week (Sunday)
const getEndOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = day === 0 ? 0 : 7 - day;
  return new Date(d.setDate(d.getDate() + diff));
};

// Helper function to parse dates as local dates
const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // Months are 0-indexed
};

// Utility function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0 || previous === null) return "N/A";
  const change = ((current - previous) / previous) * 100;
  return change.toFixed(0); // Changed to no decimals
};

const General = () => {
  // State variables
  const [totalData, setTotalData] = useState([]);
  const [envivoData, setEnvivoData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparisonMode, setComparisonMode] = useState("percentage"); // 'percentage' or 'raw'
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS.CURRENT_MONTH); // **Default to Current Month**
  const [averageData, setAverageData] = useState({
    totalAvg: "N/A",
    envivoAvg: "N/A",
  });

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
            (a, b) => parseLocalDate(a) - parseLocalDate(b)
          );

          const totalRequestsData = sortedDates.map((date) => ({
            date,
            totalRequests: totalRequestsMap[date],
          }));

          const envivoRequestsData = sortedDates.map((date) => ({
            date,
            envivoRequests: envivoRequestsMap[date] || 0,
          }));

          // Debug: Log aggregated data
          console.log("Total Requests Data:", totalRequestsData);
          console.log("Envivo Requests Data:", envivoRequestsData);

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

  // Helper functions to filter data based on selected period
  const filterDataByPeriod = (period) => {
    if (totalData.length === 0) return { filteredTotal: [], filteredEnvivo: [] };

    const latestDateStr = totalData[totalData.length - 1].date;
    const latestDate = parseLocalDate(latestDateStr);

    console.log(`Selected Period: ${period}`);
    console.log(`Latest Date: ${latestDate.toISOString().split('T')[0]}`);

    let filteredTotal = [];
    let filteredEnvivo = [];

    switch (period) {
      case PERIODS.CURRENT_WEEK:
        const startOfWeek = getStartOfWeek(latestDate);
        const endOfWeek = getEndOfWeek(latestDate);
        console.log(`Start of Week (Monday): ${startOfWeek.toISOString().split('T')[0]}`);
        console.log(`End of Week (Sunday): ${endOfWeek.toISOString().split('T')[0]}`);
        filteredTotal = totalData.filter((d) => {
          const current = parseLocalDate(d.date);
          return current >= startOfWeek && current <= endOfWeek;
        });
        filteredEnvivo = envivoData.filter((d) => {
          const current = parseLocalDate(d.date);
          return current >= startOfWeek && current <= endOfWeek;
        });
        break;

      case PERIODS.CURRENT_MONTH:
        const currentMonth = latestDate.getMonth(); // 0-11
        const currentYear = latestDate.getFullYear();
        filteredTotal = totalData.filter(
          (d) =>
            parseLocalDate(d.date).getMonth() === currentMonth &&
            parseLocalDate(d.date).getFullYear() === currentYear
        );
        filteredEnvivo = envivoData.filter(
          (d) =>
            parseLocalDate(d.date).getMonth() === currentMonth &&
            parseLocalDate(d.date).getFullYear() === currentYear
        );
        break;

      case PERIODS.CURRENT_YEAR:
        const year = latestDate.getFullYear();
        filteredTotal = totalData.filter(
          (d) => parseLocalDate(d.date).getFullYear() === year
        );
        filteredEnvivo = envivoData.filter(
          (d) => parseLocalDate(d.date).getFullYear() === year
        );
        break;

      case PERIODS.ALL_TIME:
      default:
        filteredTotal = [...totalData];
        filteredEnvivo = [...envivoData];
        break;
    }

    console.log(`Filtered Total Data Count: ${filteredTotal.length}`);
    console.log(`Filtered Envivo Data Count: ${filteredEnvivo.length}`);

    return { filteredTotal, filteredEnvivo };
  };

  // Calculate averages based on selected period
  useEffect(() => {
    const { filteredTotal, filteredEnvivo } = filterDataByPeriod(selectedPeriod);

    if (filteredTotal.length === 0) {
      setAverageData({
        totalAvg: "N/A",
        envivoAvg: "N/A",
      });
      return;
    }

    const totalSum = filteredTotal.reduce((sum, d) => sum + d.totalRequests, 0);
    const envivoSum = filteredEnvivo.reduce((sum, d) => sum + d.envivoRequests, 0);

    const totalAvg = (totalSum / filteredTotal.length).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }); // No decimals
    const envivoAvg = (envivoSum / filteredEnvivo.length).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }); // No decimals

    setAverageData({
      totalAvg,
      envivoAvg,
    });
  }, [selectedPeriod, totalData, envivoData]);

  // Function to find previous week's data for Total Requests
  const findPreviousTotalRequest = (currentDate) => {
    const current = new Date(currentDate);
    const previousDate = new Date(current);
    previousDate.setDate(current.getDate() - 7);
    const formattedDate = previousDate.toISOString().split("T")[0];
    const previousData = totalData.find((d) => d.date === formattedDate);
    return previousData ? previousData.totalRequests : null;
  };

  // Function to find previous week's data for Envivo Query
  const findPreviousEnvivoRequest = (currentDate) => {
    const current = new Date(currentDate);
    const previousDate = new Date(current);
    previousDate.setDate(current.getDate() - 7);
    const formattedDate = previousDate.toISOString().split("T")[0];
    const previousData = envivoData.find((d) => d.date === formattedDate);
    return previousData ? previousData.envivoRequests : null;
  };

  // Calculate changes for Total Requests
  const currentTotalRequest = useMemo(() => {
    if (totalData.length === 0) return null;
    return totalData[totalData.length - 1].totalRequests;
  }, [totalData]);

  const previousTotalRequest = useMemo(() => {
    if (!currentTotalRequest) return null;
    const currentDate = totalData[totalData.length - 1].date;
    return findPreviousTotalRequest(currentDate);
  }, [totalData, currentTotalRequest]);

  const totalRequestChange = useMemo(() => {
    if (previousTotalRequest === null) return "N/A";
    const change = currentTotalRequest - previousTotalRequest;
    return change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // No decimals
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
    if (currentEnvivoRequest === null) return null;
    const currentDate = envivoData[envivoData.length - 1].date;
    return findPreviousEnvivoRequest(currentDate);
  }, [envivoData, currentEnvivoRequest]);

  const envivoRequestChange = useMemo(() => {
    if (previousEnvivoRequest === null) return "N/A";
    const change = currentEnvivoRequest - previousEnvivoRequest;
    return change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // No decimals
  }, [currentEnvivoRequest, previousEnvivoRequest]);

  const envivoPercentageChange = useMemo(() => {
    if (previousEnvivoRequest === null) return "N/A";
    return calculatePercentageChange(currentEnvivoRequest, previousEnvivoRequest);
  }, [currentEnvivoRequest, previousEnvivoRequest]);

  // Toggle comparison mode
  const toggleComparisonMode = () => {
    setComparisonMode((prev) => (prev === "percentage" ? "raw" : "percentage"));
  };

  // Compute the Latest Date Label
  const latestDateLabel = useMemo(() => {
    if (totalData.length === 0) return "No data available";
    const latestDateStr = totalData[totalData.length - 1].date;
    const latestDate = parseLocalDate(latestDateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return `Viewing data for ${latestDate.toLocaleDateString(undefined, options)}`;
  }, [totalData]);

  return (
    <>
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
          direction="column"
          gap={10}
          width="100%"
          maxW="1200px"
          alignItems="center"
          bg="transparent"  // Explicitly set the background to transparent
        >
          {/* New Label Added Here */}
          <Text fontSize="sm" color="gray.400" mb={4}>
            {latestDateLabel}
          </Text>
          {/* End of New Label */}

          {/* Main Data Display: Daily Counts */}
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={10}
            width="100%"
            maxW="800px"
            justifyContent="center"
          >
            {/* Daily Request Count Box */}
            <Box
              bg="linear-gradient(90deg, #000000, #7800ff)" // Changed to linear gradient
              borderRadius="md"
              p={6}
              boxShadow="lg"
              flex="1"
              borderRadius="20px" // Adjust border-radius as desired
              border="5px solid" // Adjust border thickness as needed
              borderColor="rgba(255, 255, 255, 0.8)" // White with slight transparency for a shiny effect
              boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Optional: adds a shiny glow effect
            >
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text fontSize="md">Daily Request Count</Text> {/* Reduced fontSize */}
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
              bg="linear-gradient(90deg, #000000, #7800ff)" // Changed to linear gradient
              borderRadius="md"
              p={6}
              boxShadow="lg"
              flex="1"
              borderRadius="20px" // Adjust border-radius as desired
              border="5px solid" // Adjust border thickness as needed
              borderColor="rgba(255, 255, 255, 0.8)" // White with slight transparency for a shiny effect
              boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Optional: adds a shiny glow effect
            >
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text fontSize="md">Daily Envivo Query Count</Text> {/* Reduced fontSize */}
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
                        {envivoPercentageChange === "N/A" ? "N/A" : `${envivoPercentageChange}%`}
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

          {/* Averages Display */}
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)" // Changed to linear gradient
            borderRadius="md"
            p={6}
            boxShadow="lg"
            w="100%"
            maxW="800px"
            borderRadius="20px" // Adjust border-radius as desired
            border="5px solid" // Adjust border thickness as needed
            borderColor="rgba(255, 255, 255, 0.8)" // White with slight transparency for a shiny effect
            boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Optional: adds a shiny glow effect
          >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Text fontSize="lg">Averages for {selectedPeriod}</Text> {/* Reduced fontSize */}
              {/* Select Time Period Dropdown */}
              <Select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                placeholder="Select"
                size="sm" // Smaller size
                width="150px" // Fixed small width
                aria-label="Select Time Period" // Accessibility
              >
                {Object.values(PERIODS).map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </Select>
            </Flex>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              <Box textAlign="center">
                <Text fontSize="md" fontWeight="semibold"> {/* Reduced fontSize */}
                  Request Count
                </Text>
                <Text fontSize="2xl">
                  {averageData.totalAvg !== "N/A"
                    ? averageData.totalAvg.toLocaleString()
                    : "N/A"}
                </Text>
              </Box>
              <Box textAlign="center">
                <Text fontSize="md" fontWeight="semibold"> {/* Reduced fontSize */}
                  Envivo Query Count
                </Text>
                <Text fontSize="2xl">
                  {averageData.envivoAvg !== "N/A"
                    ? averageData.envivoAvg.toLocaleString()
                    : "N/A"}
                </Text>
              </Box>
            </Grid>
          </Box>
        </Flex>
      )}
    </>
  );
};

export default General;
