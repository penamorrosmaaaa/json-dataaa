/* src/components/DataTable/DataTable.js */

import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tfoot,
  TableContainer,
  Text,
  Flex,
  Tooltip,
  Select,
  FormControl,
  FormLabel,
  Spinner,
  IconButton,
  Button,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import Plot from "react-plotly.js";
import Papa from "papaparse"; // Import PapaParse

// Function to get RGBA fill color based on line color
function getFillColor(lineColor) {
  if (lineColor === "red") {
    return "rgba(255, 0, 0, 0.2)";
  } else if (lineColor === "green") {
    return "rgba(0, 255, 0, 0.2)";
  }
  // Default fill color if needed
  return "rgba(0, 0, 255, 0.2)";
}

const DataTable = () => {
  // State to manage all CSV data
  const [allData, setAllData] = useState([]);

  // State to manage table data
  const [tableData, setTableData] = useState([]);

  // State to track loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State to store the most recent date found in CSV
  const [mostRecentDate, setMostRecentDate] = useState(null);

  // State to manage the currently selected date
  const [currentDate, setCurrentDate] = useState(null);

  // State to manage the selected row for detailed graph
  const [selectedRow, setSelectedRow] = useState(null);

  // State for day of week selection
  const [selectedDay, setSelectedDay] = useState("All");

  // State for comparison mode
  const [isComparing, setIsComparing] = useState(false);
  const [compareDay, setCompareDay] = useState("");

  // Function to handle row click
  const handleRowClick = (row) => {
    setSelectedRow(row);
    // Reset day selection and comparison when a new row is selected
    setSelectedDay("All");
    setIsComparing(false);
    setCompareDay("");
  };

  // Fetch and process CSV data on component mount
  useEffect(() => {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVHwv5X6-u3M7f8HJNih14hSnVpBlNKFUe_O76bTUJ2PaaOAfrqIrwjWsyc9DNFKxcYoEsWutl1_K6/pub?output=csv";

    Papa.parse(csvUrl, {
      download: true,
      header: true, // Assume the first row is header
      skipEmptyLines: true, // Skip empty lines
      complete: (results) => {
        try {
          const data = results.data;

          // Log parsed data for debugging
          console.log("Parsed CSV Data:", data.slice(0, 5)); // Log first 5 rows

          // Extract all unique dates and find the most recent one
          const dates = data
            .map((row) => row.Date) // Use 'Date' with capital D
            .filter((date) => date) // Remove any undefined or null dates
            .sort((a, b) => new Date(a) - new Date(b)); // Sort ascending

          console.log("Extracted Dates:", dates.slice(0, 5)); // Log first 5 dates

          if (dates.length === 0) {
            throw new Error("No dates found in the CSV data.");
          }

          const latestDate = dates[dates.length - 1];
          setMostRecentDate(latestDate);
          setCurrentDate(latestDate); // Initialize currentDate to latestDate

          // Filter data for the most recent date
          const recentData = data.filter((row) => row.Date === latestDate);

          console.log("Recent Data Count:", recentData.length); // Log count

          if (recentData.length === 0) {
            throw new Error("No data available for the most recent date.");
          }

          // Convert Request Count to integer
          const processedData = recentData.map((row) => ({
            object: row.Object, // Use 'Object' with capital O
            requestCount: parseInt(row["Request Count"], 10), // Use 'Request Count' exactly
          }));

          console.log("Processed Data Sample:", processedData.slice(0, 5)); // Log first 5 processed rows

          // Sort by requestCount descending
          processedData.sort((a, b) => b.requestCount - a.requestCount);

          // Take top 50
          const top50 = processedData.slice(0, 50);

          // Calculate total requests for percentage
          const totalRequests = top50.reduce(
            (sum, row) => sum + row.requestCount,
            0
          );

          // Map to tableData format with percentage and amount
          const formattedData = top50.map((row) => ({
            object: row.object,
            percentage: `${((row.requestCount / totalRequests) * 100).toFixed(1)}%`,
            amount: row.requestCount.toLocaleString(),
          }));

          console.log("Formatted Data Sample:", formattedData.slice(0, 5)); // Log first 5 formatted rows

          setTableData(formattedData);
          setAllData(data); // Store all data for historical purposes
          setLoading(false);
        } catch (err) {
          console.error("Error processing CSV data:", err);
          setError(err.message || "Failed to process data.");
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("Error fetching CSV data:", err);
        setError("Failed to fetch data.");
        setLoading(false);
      },
    });
  }, []);

  // Get all unique dates sorted ascending
  const sortedDates = useMemo(() => {
    const uniqueDates = Array.from(new Set(allData.map((row) => row.Date))).filter(
      (date) => date
    );
    uniqueDates.sort((a, b) => new Date(a) - new Date(b)); // Sort ascending
    return uniqueDates;
  }, [allData]);

  const currentIndex = useMemo(() => {
    return sortedDates.indexOf(currentDate);
  }, [currentDate, sortedDates]);

  const goToPreviousDate = () => {
    if (currentIndex > 0) {
      setCurrentDate(sortedDates[currentIndex - 1]);
    }
  };

  const goToNextDate = () => {
    if (currentIndex < sortedDates.length - 1) {
      setCurrentDate(sortedDates[currentIndex + 1]);
    }
  };

  // Compute displayedData based on currentDate
  const displayedData = useMemo(() => {
    if (!currentDate) return [];

    // Filter allData for the currentDate
    const recentData = allData.filter((row) => row.Date === currentDate);

    if (recentData.length === 0) {
      return [];
    }

    // Convert Request Count to integer
    const processedData = recentData.map((row) => ({
      object: row.Object,
      requestCount: parseInt(row["Request Count"], 10),
    }));

    // Sort by requestCount descending
    processedData.sort((a, b) => b.requestCount - a.requestCount);

    // Take top 50
    const top50 = processedData.slice(0, 50);

    // Calculate total requests for percentage
    const totalRequests = top50.reduce((sum, row) => sum + row.requestCount, 0);

    // Map to tableData format with percentage and amount
    const formattedData = top50.map((row) => ({
      object: row.object,
      percentage: `${((row.requestCount / totalRequests) * 100).toFixed(1)}%`,
      amount: row.requestCount.toLocaleString(),
    }));

    return formattedData;
  }, [currentDate, allData]);

  // Update selectedRow based on displayedData
  useEffect(() => {
    const initialRow =
      displayedData.find((row) => row.object === "/envivo/query") ||
      (displayedData.length > 0 ? displayedData[0] : null);
    setSelectedRow(initialRow);
  }, [displayedData]);

  // Memoized historic data for the selected row to optimize performance
  const historicData = useMemo(() => {
    if (!selectedRow) return [];

    // Filter allData for the selected object
    const filtered = allData.filter(
      (row) => row.Object === selectedRow.object && row.Date
    );

    // Map to desired format
    const mappedData = filtered.map((row) => {
      // **Accurate Date Parsing Starts Here**
      // Ensure the date is parsed correctly by manually extracting components
      const dateParts = row.Date.split("-");
      if (dateParts.length !== 3) {
        console.error(`Invalid date format for row: ${row.Date}`);
        return {
          x: row.Date, // Keep original date string
          y: parseInt(row["Request Count"], 10),
          dayOfWeek: null,
          isSunday: false,
        };
      }

      const [year, month, day] = dateParts.map(Number);
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
      ) {
        console.error(`Invalid date components for row: ${row.Date}`);
        return {
          x: row.Date, // Keep original date string
          y: parseInt(row["Request Count"], 10),
          dayOfWeek: null,
          isSunday: false,
        };
      }

      // Create a UTC date to avoid timezone issues
      const dateObj = new Date(Date.UTC(year, month - 1, day));

      // **Accurate Date Parsing Ends Here**

      return {
        x: row.Date, // Date string in 'YYYY-MM-DD' format
        y: parseInt(row["Request Count"], 10),
        dayOfWeek: dateObj.getUTCDay(), // 0 (Sunday) to 6 (Saturday)
        isSunday: dateObj.getUTCDay() === 0,
      };
    });

    // Remove any entries with invalid dates
    const validMappedData = mappedData.filter((d) => d.dayOfWeek !== null);

    // Sort by date ascending
    validMappedData.sort((a, b) => new Date(a.x) - new Date(b.x));

    return validMappedData;
  }, [selectedRow, allData]);

  // Function to filter historic data based on selected day and comparison
  const getFilteredData = () => {
    if (selectedDay === "All" && !isComparing) {
      return { primary: historicData, comparison: [] };
    }

    const daysMap = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    let primary = historicData;

    if (selectedDay !== "All") {
      const dayNumber = daysMap[selectedDay];
      primary = historicData.filter((d) => d.dayOfWeek === dayNumber);
    }

    let comparison = [];
    if (isComparing && compareDay !== "") {
      const compareDayNumber = daysMap[compareDay];
      comparison = historicData.filter((d) => d.dayOfWeek === compareDayNumber);
    }

    return { primary: primary, comparison: comparison };
  };

  const filteredData = getFilteredData();

  // Prepare data traces for Plotly
  const prepareTraces = () => {
    const traces = [];

    // Primary Trace
    traces.push({
      x: filteredData.primary.map((d) => d.x),
      y: filteredData.primary.map((d) => d.y),
      type: "scatter",
      mode: "lines+markers",
      name: selectedDay === "All" ? "All Days" : selectedDay,
      line: {
        color: "green", // Line color remains green
        width: 2,
        shape: "spline",
      },
      marker: {
        color: filteredData.primary.map((d) =>
          d.isSunday ? "red" : "green"
        ), // Sundays in red, others in green
        size: 6,
      },
      fill: "tozeroy",
      fillcolor: getFillColor("green"), // Match fill color to line color
      hovertemplate: "%{x|%b %d, %Y}<br>Amount: %{y}<extra></extra>", // Customized tooltip
    });

    // Comparison Trace
    if (isComparing && compareDay !== "") {
      traces.push({
        x: filteredData.comparison.map((d) => d.x),
        y: filteredData.comparison.map((d) => d.y),
        type: "scatter",
        mode: "lines+markers",
        name: `Compare: ${compareDay}`,
        line: {
          color: "orange",
          width: 2,
          shape: "spline",
        },
        marker: {
          color: "orange", // Always orange, even if compareDay is Sunday
          size: 6,
        },
        fill: "tozeroy",
        fillcolor: "rgba(255, 165, 0, 0.2)", // Light orange fill
        hovertemplate: "%{x|%b %d, %Y}<br>Amount: %{y}<extra></extra>", // Customized tooltip
      });
    }

    return traces;
  };

  const traces = prepareTraces();

  // Function to determine the graph title
  const getGraphTitle = () => {
    if (!selectedRow) return "Select a Row to View Details";

    let title = `Request Count Over Time (${currentDate})`;
    if (selectedDay !== "All") {
      title += ` (${selectedDay})`;
    }

    if (isComparing && compareDay !== "") {
      title += ` | Comparing with ${compareDay}`;
    }

    return title;
  };

  // Loading State
  if (loading) {
    return (
      <Box
        p={5}
        minH="100vh"
        color="white"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Spinner size="xl" />
        <Text ml={4} fontSize="2xl">
          Loading data...
        </Text>
      </Box>
    );
  }

  // Error State
  if (error) {
    return (
      <Box
        p={5}
        minH="100vh"
        color="white"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="2xl" color="red.500">
          {error}
        </Text>
      </Box>
    );
  }

  return (
    <Box
      p={5}
      minH="100vh"
      color="white"
      display="flex"
      flexDirection="column"
      alignItems="center" // Center child components horizontally
      overflow="hidden" // Prevent overall overflow
    >
      {/* Table and Detailed Graph Section */}
      <Flex
        direction={{ base: "column", md: "row" }}
        width={{ base: "100%", md: "87%" }}
        overflow="hidden" // Prevent overflow
      >
        {/* Table Section */}
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)" // Changed to linear gradient
          borderRadius="md"
          p={6}
          boxShadow="lg"
          flex="1"
          mr={{ base: 0, md: 8 }} // Margin right on medium screens and above
          mb={{ base: 8, md: 0 }} // Bottom margin on small screens
          overflow="hidden" // Prevent overflow
          borderRadius="20px" // Adjust border-radius as desired
    border="5px solid" // Adjust border thickness as needed
    borderColor="rgba(255, 255, 255, 0.8)" // White with slight transparency for a shiny effect
    boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Optional: adds a shiny glow effect
        >
          {/* Navigation Arrows */}
          <Box display="flex" alignItems="center" mb={4}>
            <IconButton
              icon={<ChevronLeftIcon />}
              onClick={goToPreviousDate}
              isDisabled={currentIndex <= 0}
              aria-label="Previous Date"
              mr={2}
            />
            <Text fontSize="md">
              {currentDate ? `Viewing Data for: ${currentDate}` : "No Date Selected"}
            </Text>
            <IconButton
              icon={<ChevronRightIcon />}
              onClick={goToNextDate}
              isDisabled={currentIndex >= sortedDates.length - 1}
              aria-label="Next Date"
              ml={2}
            />
          </Box>

          <TableContainer
            overflowY="scroll"
            maxH="400px" // Adjust this value based on the approximate height of 10 rows
            overflowX="hidden" // Prevent horizontal scrolling
          >
            <Table variant="simple" size="sm" sx={{ tableLayout: "auto" }}>
              <Thead>
                <Tr>
                  <Th
                    maxW="200px"
                    isTruncated
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    Object
                  </Th>
                  <Th isNumeric>Percentage</Th>
                  <Th isNumeric>Amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {displayedData.map((row, index) => {
                  return (
                    <Tr
                      key={index}
                      _hover={{
                        cursor: "pointer",
                      }}
                      onClick={() => handleRowClick(row)}
                      bg={
                        selectedRow && selectedRow.object === row.object
                          ? "rgba(255, 255, 255, 0.3)"
                          : "transparent"
                      } // Highlight the selected row
                    >
                      <Td>
                        <Tooltip label={row.object} hasArrow>
                          <Text isTruncated maxW="200px">
                            {row.object}
                          </Text>
                        </Tooltip>
                      </Td>
                      <Td isNumeric>{row.percentage}</Td>
                      <Td isNumeric>{row.amount}</Td>
                    </Tr>
                  );
                })}
              </Tbody>
              <Tfoot>
                <Tr>
                  <Th
                    maxW="200px"
                    isTruncated
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    Object
                  </Th>
                  <Th isNumeric>Percentage</Th>
                  <Th isNumeric>Amount</Th>
                </Tr>
              </Tfoot>
            </Table>
          </TableContainer>
        </Box>

        {/* Detailed Graph Section */}
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)" // Changed to linear gradient
          borderRadius="md"
          p={6}
          boxShadow="lg"
          flex="1"
          overflow="hidden" // Prevent overflow
          borderRadius="20px" // Adjust border-radius as desired
    border="5px solid" // Adjust border thickness as needed
    borderColor="rgba(255, 255, 255, 0.8)" // White with slight transparency for a shiny effect
    boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Optional: adds a shiny glow effect
        >
          <Flex direction="column" alignItems="center" mb={4}>
            <Text fontSize="2xl" mb={4} textAlign="center">
              {getGraphTitle()}
            </Text>
            {selectedRow && (
              <Flex
                direction={{ base: "column", md: "row" }}
                gap={4}
                mb={4}
                width="100%"
                maxW="600px"
              >
                {/* Day-of-Week Dropdown */}
                <FormControl>
                  <FormLabel>Select Day of Week</FormLabel>
                  <Select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    placeholder="All Days"
                  >
                    <option value="All">All Days</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </Select>
                </FormControl>

                {/* Compare Button */}
                <FormControl>
                  <FormLabel>Comparison</FormLabel>
                  <Flex alignItems="center">
                    <Select
                      value={compareDay}
                      onChange={(e) => setCompareDay(e.target.value)}
                      placeholder="Compare with..."
                      isDisabled={!isComparing}
                      maxW="200px"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </Select>
                    <Box ml={2}>
                      <Button
                        onClick={() => setIsComparing(!isComparing)}
                        colorScheme={isComparing ? "teal" : "gray"}
                        variant={isComparing ? "solid" : "outline"}
                      >
                        {isComparing ? "Cancel Compare" : "Compare"}
                      </Button>
                    </Box>
                  </Flex>
                </FormControl>
              </Flex>
            )}
          </Flex>
          {selectedRow ? (
            <Box overflow="auto">
              <Plot
                data={traces}
                layout={{
                  autosize: true,
                  height: 500, // Adjusted height for better visibility
                  margin: { l: 50, r: 50, t: 50, b: 100 }, // Increased bottom margin for x-axis labels
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  xaxis: {
                    title: "Date",
                    type: "date", // Ensure x-axis is treated as date
                    showgrid: true,
                    gridcolor: "#444",
                    tickfont: { color: "white" },
                    tickangle: -45,
                    automargin: true,
                    tickformat: "%b %Y", // Format to show month and year
                    dtick: "M1", // Set tick interval to monthly
                    rangeslider: { visible: true }, // Enable range slider
                  },
                  yaxis: {
                    title: "Amount",
                    showgrid: true,
                    gridcolor: "#444",
                    tickfont: { color: "white" },
                    autorange: true, // Enable dynamic scaling
                  },
                  font: {
                    color: "white",
                  },
                  legend: {
                    orientation: "h",
                    y: -0.2,
                    x: 0.5,
                    xanchor: "center",
                    yanchor: "top",
                  },
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: [
                    "zoom2d",
                    "pan2d",
                    "select2d",
                    "lasso2d",
                    "zoomIn2d",
                    "zoomOut2d",
                    "autoScale2d",
                    "resetScale2d",
                    "hoverClosestCartesian",
                    "hoverCompareCartesian",
                  ],
                  scrollZoom: false, // Disable scroll zoom
                  doubleClick: false, // Disable double-click zoom
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }} // Make Plot responsive
              />
            </Box>
          ) : (
            <Text textAlign="center" color="gray.300">
              Click on a row to view the historic graph.
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default DataTable;
