/* src/components/RequestCountGraph/RequestCountGraph.js */
import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Select,
  Button,
} from "@chakra-ui/react";
import Plot from "react-plotly.js";
import Papa from "papaparse"; // Import PapaParse

const RequestCountGraph = () => {
  // State to hold aggregated request count data
  const [aggregatedData, setAggregatedData] = useState([]);

  // State for loading and error handling
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate the date 6 months ago from today for the initial visible range
  const sixMonthsAgo = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 6);
    // Handle cases where subtracting months results in invalid dates
    return date.toISOString().split("T")[0];
  }, []);

  // Current date in ISO format
  const currentDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // State for visible range on the x-axis (preset to the most recent 6 months)
  const [visibleRange, setVisibleRange] = useState([sixMonthsAgo, currentDate]);

  // States for day filters
  const [selectedDay, setSelectedDay] = useState("All");
  const [isComparing, setIsComparing] = useState(false);
  const [compareDay, setCompareDay] = useState(""); // Removed default "All"

  // Function to fetch and process CSV data using PapaParse
  const fetchAndProcessCSV = async () => {
    try {
      const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVHwv5X6-u3M7f8HJNih14hSnVpBlNKFUe_O76bTUJ2PaaOAfrqIrwjWsyc9DNFKxcYoEsWutl1_K6/pub?output=csv"; // **Updated CSV URL**

      const response = await fetch(csvUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch CSV data: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();

      // Parse CSV using PapaParse
      const parsedData = Papa.parse(csvText, {
        header: true, // Assuming the CSV has headers
        skipEmptyLines: true,
      });

      if (parsedData.errors.length > 0) {
        console.error("CSV Parsing Errors:", parsedData.errors);
        throw new Error("Error parsing CSV data.");
      }

      const dataRows = parsedData.data;

      if (!Array.isArray(dataRows) || dataRows.length === 0) {
        throw new Error("CSV contains no data.");
      }

      // Aggregate data: sum request counts per date
      const aggregationMap = {};

      dataRows.forEach((row, index) => {
        const dateStr = row["Date"]?.trim(); // **Updated to match CSV header**
        const requestCountStr = row["Request Count"]?.trim(); // **Updated to match CSV header**

        if (!dateStr || !requestCountStr) {
          console.warn(`Skipping row ${index + 2} due to missing date or request count.`);
          return; // Skip rows with missing data
        }

        // Parse date as local date
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Local time

        if (isNaN(date.getTime())) {
          console.warn(`Invalid date on row ${index + 2}: ${dateStr}`);
          return; // Skip rows with invalid dates
        }

        const requestCount = parseInt(requestCountStr, 10);

        if (isNaN(requestCount)) {
          console.warn(`Invalid request count on row ${index + 2}: ${requestCountStr}`);
          return; // Skip rows with invalid request counts
        }

        const dateKey = date.toISOString().split("T")[0]; // Ensure consistent date format

        if (!aggregationMap[dateKey]) {
          aggregationMap[dateKey] = 0;
        }

        aggregationMap[dateKey] += requestCount;
      });

      // Convert aggregation map to array and sort by date ascendingly
      const mappedData = Object.keys(aggregationMap)
        .map((date) => ({
          date,
          totalRequests: aggregationMap[date],
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setAggregatedData(mappedData);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching or processing CSV data:", err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Function to load data by fetching fresh data from the CSV
  const loadData = () => {
    setIsLoading(true);
    setError(null);
    fetchAndProcessCSV();
  };

  // Fetch data on component mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler for relayout events (e.g., range slider)
  const handleRelayout = (event) => {
    console.log("Relayout Event:", event);
    let newStart, newEnd;

    if (event["xaxis.range[0]"] && event["xaxis.range[1]"]) {
      newStart = event["xaxis.range[0]"];
      newEnd = event["xaxis.range[1]"];
    } else if (event["xaxis.range"]) {
      [newStart, newEnd] = event["xaxis.range"];
    }

    if (newStart && newEnd) {
      console.log("Updating Visible Range:", [newStart, newEnd]);
      setVisibleRange([newStart, newEnd]);
    }
  };

  // Determine the title based on the visible range and comparison
  const getTitle = () => {
    if (!visibleRange) return "Request Count Over Time";
    const [start, end] = visibleRange;
    const formattedStart = new Date(start).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const formattedEnd = new Date(end).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    let title = `Request Count Over Time (${formattedStart} - ${formattedEnd})`;
    if (isComparing && compareDay !== "") {
      title += ` | Comparing with ${compareDay}`;
    }
    return title;
  };

  // Handler for primary dropdown selection
  const handleDayChange = (e) => {
    setSelectedDay(e.target.value);
    // Reset compare selection when primary selection changes
    if (!isComparing) {
      setVisibleRange([sixMonthsAgo, currentDate]);
    }
  };

  // Handler for compare dropdown selection
  const handleCompareDayChange = (e) => {
    setCompareDay(e.target.value);
    setVisibleRange([sixMonthsAgo, currentDate]);
  };

  // Handler for Compare button toggle
  const toggleCompare = () => {
    setIsComparing(!isComparing);
    // Reset compareDay when disabling compare mode
    if (isComparing) {
      setCompareDay("");
    }
  };

  // Function to filter data based on selected days
  const getFilteredData = () => {
    if (selectedDay === "All" && !isComparing) {
      return aggregatedData;
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

    let filtered = aggregatedData;

    if (selectedDay !== "All") {
      const dayNumber = daysMap[selectedDay];
      filtered = filtered.filter((d) => {
        const [year, month, day] = d.date.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Local time
        const dayOfWeek = date.getDay();
        return dayOfWeek === dayNumber;
      });
    }

    if (isComparing && compareDay !== "") {
      const compareDayNumber = daysMap[compareDay];
      const comparisonData = aggregatedData.filter((d) => {
        const [year, month, day] = d.date.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Local time
        const dayOfWeek = date.getDay();
        return dayOfWeek === compareDayNumber;
      });
      filtered = [...filtered, ...comparisonData];
    }

    return filtered;
  };

  const filteredData = getFilteredData();

  // Prepare data traces for Plotly
  const prepareTraces = () => {
    const traces = [];

    if (isComparing && compareDay !== "" && selectedDay !== "All") {
      const daysMap = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };

      const primaryData = aggregatedData.filter(
        (d) => {
          const [year, month, day] = d.date.split('-').map(Number);
          const date = new Date(year, month - 1, day); // Local time
          const dayOfWeek = date.getDay();
          return dayOfWeek === daysMap[selectedDay];
        }
      );

      const comparisonData = aggregatedData.filter(
        (d) => {
          const [year, month, day] = d.date.split('-').map(Number);
          const date = new Date(year, month - 1, day); // Local time
          const dayOfWeek = date.getDay();
          return dayOfWeek === daysMap[compareDay];
        }
      );

      // Create maps for easy lookup
      const primaryMap = new Map(primaryData.map((d) => [d.date, d.totalRequests]));
      const comparisonMap = new Map(comparisonData.map((d) => [d.date, d.totalRequests]));

      // Create a sorted list of all unique dates from both datasets
      const allDatesSet = new Set([...primaryMap.keys(), ...comparisonMap.keys()]);
      const allDates = Array.from(allDatesSet).sort((a, b) => new Date(a) - new Date(b));

      // Create y-values aligned to allDates
      const primaryY = allDates.map((date) => primaryMap.get(date) || 0);
      const comparisonY = allDates.map((date) => comparisonMap.get(date) || 0);

      traces.push(
        {
          x: allDates,
          y: primaryY,
          type: "bar",
          name: selectedDay,
          marker: {
            color: "#0074D9",
            line: {
              color: "#ffffff",
              width: 0.5,
            },
          },
          hovertemplate:
            "%{x|%d-%b-%Y}<br>Total Requests: %{y}<extra></extra>", // Adjusted date format
        },
        {
          x: allDates,
          y: comparisonY,
          type: "bar",
          name: compareDay,
          marker: {
            color: "#FF851B",
            line: {
              color: "#ffffff",
              width: 0.5,
            },
          },
          hovertemplate:
            "%{x|%d-%b-%Y}<br>Total Requests: %{y}<extra></extra>", // Adjusted date format
        }
      );
    } else {
      // Single trace
      traces.push({
        x: filteredData.map((d) => d.date),
        y: filteredData.map((d) => d.totalRequests),
        type: "bar",
        marker: {
          color:
            selectedDay === "All"
              ? filteredData.map((d) => {
                  const [year, month, day] = d.date.split('-').map(Number);
                  const date = new Date(year, month - 1, day); // Local time
                  const dayOfWeek = date.getDay();
                  return dayOfWeek === 0 ? "#FF4136" : "#0074D9"; // **Red for Sundays, Blue otherwise**
                })
              : "#0074D9",
          line: {
            color: "#ffffff",
            width: 0.5,
          },
        },
        hovertemplate:
          "%{x|%d-%b-%Y}<br>Total Requests: %{y}<extra></extra>", // Adjusted date format
        name: "Total Requests",
      });
    }

    return traces;
  };

  const traces = prepareTraces();

  // **Memo: Calculate Monthly Tick Values and Labels Based on Filtered Data**
  const monthTicks = useMemo(() => {
    const ticks = [];
    const labels = [];
    const seenMonths = new Set();

    filteredData.forEach((d) => {
      const [year, month, day] = d.date.split('-').map(Number);
      const date = new Date(year, month - 1, day); // Local time
      const monthKey = `${date.getMonth()}-${date.getFullYear()}`;

      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        const isoDate = date.toISOString().split('T')[0]; // "YYYY-MM-DD"
        ticks.push(isoDate);
        labels.push(date.toLocaleString("default", { month: "short", year: "numeric" }));
      }
    });

    return { tickVals: ticks, tickTexts: labels };
  }, [filteredData]);

  // **Memo: Calculate Y-Axis Range Based on Visible Data**
  const yAxisRange = useMemo(() => {
    const [startStr, endStr] = visibleRange;
    const [startYear, startMonth, startDay] = startStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endStr.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay); // Local time
    const end = new Date(endYear, endMonth - 1, endDay); // Local time
    console.log("Visible Range (Date Objects):", start, end);
    const visibleData = filteredData.filter((d) => {
      const [year, month, day] = d.date.split('-').map(Number);
      const date = new Date(year, month - 1, day); // Local time
      return date >= start && date <= end;
    });
    console.log("Visible Data Count:", visibleData.length);
    if (visibleData.length === 0) {
      console.warn("No data visible in the current range. Setting default Y-Axis Range.");
      return [0, 400000000]; // Default range if no data is visible
    }
    const maxRequest = Math.max(...visibleData.map((d) => d.totalRequests), 0);
    const calculatedRange = maxRequest > 0 ? [0, maxRequest * 1.1] : [0, 100];
    console.log("Calculated Y-Axis Range:", calculatedRange);
    return calculatedRange; // 10% buffer
  }, [visibleRange, filteredData]);

  // **Refresh Data Function (Already exists, kept for completeness)**
  const refreshData = () => {
    loadData();
  };

  return (
    <Box
      p={5}
      minH="100vh"
      color="white"
      display="flex"
      flexDirection="column"
      alignItems="center"
      overflow="hidden"
      // **Removed the background property to revert to original background**
    >
      <Flex
        direction="column"
        width={{ base: "100%", md: "90%" }}
        maxW="1200px"
      >
        {/* Integrated Controls and Main Chart Section */}
        <Box
          // **Removed the background property to revert to original background format**
          bg="linear-gradient(90deg, #000000, #7800ff)" // Changed to linear gradient
          borderRadius="md"
          p={4} // **Preserved original padding**
          boxShadow="lg" // **Preserved original shadow**
          width="100%"
          display="flex"
          flexDirection="column"
          gap={6} // **Space between controls and chart**
          borderRadius="20px" // Adjust border-radius as desired
    border="5px solid" // Adjust border thickness as needed
    borderColor="rgba(255, 255, 255, 0.8)" // White with slight transparency for a shiny effect
    boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Optional: adds a shiny glow effect
        >
          {/* Controls */}
          <Flex
            alignItems="center"
            flexDirection={{ base: "column", md: "row" }}
            gap={4}
          >
            {/* Primary Day Selection */}
            <Flex alignItems="center">
              <Text fontSize="lg" mr={4}>
                Select Day:
              </Text>
              <Select
                placeholder="All Days"
                value={selectedDay}
                onChange={handleDayChange}
                maxW="200px"
                bg="white"
                color="black"
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
            </Flex>

            {/* Compare Button */}
            <Flex alignItems="center">
              <Button
                onClick={toggleCompare}
                colorScheme={isComparing ? "teal" : "gray"}
                variant={isComparing ? "solid" : "outline"}
              >
                {isComparing ? "Cancel Compare" : "Compare"}
              </Button>
            </Flex>

            {/* Secondary Day Selection for Comparison */}
            {isComparing && (
              <Flex alignItems="center">
                <Text fontSize="lg" mr={4}>
                  Compare with:
                </Text>
                <Select
                  placeholder="Select Day"
                  value={compareDay}
                  onChange={handleCompareDayChange}
                  maxW="200px"
                  bg="white"
                  color="black"
                >
                  {/* Removed the redundant "All Days" option here */}
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </Select>
              </Flex>
            )}

            {/* **Refresh Button** */}
            <Flex alignItems="center">
              <Button
                onClick={refreshData}
                colorScheme="blue"
                variant="solid"
              >
                Refresh Data
              </Button>
            </Flex>
          </Flex>

          {/* Main Chart */}
          <Box>
            <Flex justifyContent="space-between" alignItems="center" mb={6}>
              <Text fontSize="2xl" textAlign="center">
                {isLoading || error ? "Request Count Over Time" : getTitle()}
              </Text>
              {/* **Optional: Display Last Updated Time** */}
              {!isLoading && !error && (
                <Text fontSize="sm" color="gray.300">
                  Last Updated: {new Date().toLocaleString()}
                </Text>
              )}
            </Flex>
            {isLoading ? (
              <Flex
                justifyContent="center"
                alignItems="center"
                height="600px"
              >
                <Spinner size="xl" color="white" />
              </Flex>
            ) : error ? (
              <Text color="red.500" textAlign="center">
                {error}
              </Text>
            ) : aggregatedData.length === 0 ? (
              <Text color="white" textAlign="center">
                No data available to display.
              </Text>
            ) : (
              <Plot
                data={traces}
                layout={{
                  autosize: true,
                  height: 600, // Preserved original height
                  margin: { l: 80, r: 30, t: 60, b: 100 }, // Preserved original margins
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  xaxis: {
                    title: "Date", // Changed from "Month" to "Date"
                    type: "date", // Changed from 'category' to 'date'
                    showgrid: true,
                    gridcolor: "#444",
                    tickfont: { color: "white", size: 10 },
                    showticklabels: true, // Ensure tick labels are shown
                    tickangle: filteredData.length > 20 ? -45 : 0, // Rotate labels if many data points
                    fixedrange: true, // Disable zooming and panning on x-axis
                    range: visibleRange, // Use date strings directly
                    rangeslider: {
                      visible: true,
                      thickness: 0.15, // Thickness of the slider
                      range: aggregatedData.length > 0
                        ? [
                            aggregatedData[0].date,
                            aggregatedData[aggregatedData.length - 1].date,
                          ]
                        : [sixMonthsAgo, currentDate], // Full data range
                      tickformat: "%b %Y", // Adjusted to match month-year format
                    },
                    rangeselector: {
                      visible: false, // Hide range selector buttons
                    },
                    // **Apply Monthly Ticks Based on Filtered Data**
                    tickmode: monthTicks.tickVals.length > 0 ? "array" : "auto",
                    tickvals: monthTicks.tickVals.length > 0 ? monthTicks.tickVals : undefined,
                    ticktext: monthTicks.tickTexts.length > 0 ? monthTicks.tickTexts : undefined,
                  },
                  yaxis: {
                    title: "Total Requests",
                    showgrid: true,
                    gridcolor: "#444",
                    tickfont: { color: "white" },
                    range: yAxisRange, // **Dynamic Y-Axis Range**
                    fixedrange: false, // **Allow Y-Axis Interactivity**
                    autorange: false, // **Disable Auto Range to use custom range**
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
                  // **Set Barmode to Group**
                  barmode: "group",
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
                style={{ width: "100%", height: "100%" }} // Make Plot responsive
                onRelayout={handleRelayout} // Handle relayout events
              />
            )}
          </Box>
        </Box>
      </Flex>
    </Box>
  );
};

export default RequestCountGraph;
