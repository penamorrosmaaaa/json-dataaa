/* src/components/RequestCountGraph/RequestCountGraph.js */

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Select,
  Button,
  FormControl,
  FormLabel,
  useBreakpointValue,
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
  const [visibleRange, setVisibleRange] = useState([
    sixMonthsAgo,
    currentDate,
  ]);

  // States for day filters
  const [selectedDay, setSelectedDay] = useState("All");
  const [isComparing, setIsComparing] = useState(false);
  const [compareDay, setCompareDay] = useState(""); // Removed default "All"

  // Function to fetch and process CSV data using PapaParse
  const fetchAndProcessCSV = async () => {
    try {
      const csvUrl =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVHwv5X6-u3M7f8HJNih14hSnVpBlNKFUe_O76bTUJ2PaaOAfrqIrwjWsyc9DNFKxcYoEsWutl1_K6/pub?output=csv"; // **Updated CSV URL**

      const response = await fetch(csvUrl);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch CSV data: ${response.status} ${response.statusText}`
        );
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
        const date = row["Date"]?.trim(); // **Updated to match CSV header**
        const requestCountStr = row["Request Count"]?.trim(); // **Updated to match CSV header**

        if (!date || !requestCountStr) {
          console.warn(
            `Skipping row ${index + 2} due to missing date or request count.`
          );
          return; // Skip rows with missing data
        }

        const requestCount = parseInt(requestCountStr, 10);

        if (isNaN(requestCount)) {
          console.warn(
            `Invalid request count on row ${index + 2}: ${requestCountStr}`
          );
          return; // Skip rows with invalid request counts
        }

        if (!aggregationMap[date]) {
          aggregationMap[date] = 0;
        }

        aggregationMap[date] += requestCount;
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
      filtered = aggregatedData.filter((d) => {
        const day = new Date(d.date).getDay();
        return day === dayNumber;
      });
    }

    if (isComparing && compareDay !== "") {
      const compareDayNumber = daysMap[compareDay];
      const comparisonData = aggregatedData.filter((d) => {
        const day = new Date(d.date).getDay();
        return day === compareDayNumber;
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
        (d) =>
          Object.keys(daysMap).find(
            (key) => daysMap[key] === new Date(d.date).getDay()
          ) === selectedDay
      );

      const comparisonData = aggregatedData.filter(
        (d) =>
          Object.keys(daysMap).find(
            (key) => daysMap[key] === new Date(d.date).getDay()
          ) === compareDay
      );

      // Create maps for easy lookup
      const primaryMap = new Map(
        primaryData.map((d) => [d.date, d.totalRequests])
      );
      const comparisonMap = new Map(
        comparisonData.map((d) => [d.date, d.totalRequests])
      );

      // Create a sorted list of all unique dates from both datasets
      const allDatesSet = new Set([
        ...primaryMap.keys(),
        ...comparisonMap.keys(),
      ]);
      const allDates = Array.from(allDatesSet).sort(
        (a, b) => new Date(a) - new Date(b)
      );

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
                  const day = new Date(d.date).getDay();
                  return day === 6 ? "#FF4136" : "#0074D9"; // Red for Saturdays, Blue otherwise
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

  // **New Memo: Calculate Monthly Tick Values and Labels Based on Filtered Data**
  const monthTicks = useMemo(() => {
    const ticks = [];
    const labels = [];
    const seenMonths = new Set();

    filteredData.forEach((d) => {
      const date = new Date(d.date);
      const monthKey = `${date.getMonth()}-${date.getFullYear()}`;

      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        const isoDate = d.date; // Assuming d.date is in ISO format "YYYY-MM-DD"
        ticks.push(isoDate);
        labels.push(
          date.toLocaleString("default", { month: "short", year: "numeric" })
        );
      }
    });

    return { tickVals: ticks, tickTexts: labels };
  }, [filteredData]);

  // **New Memo: Calculate Y-Axis Range Based on Visible Data**
  const yAxisRange = useMemo(() => {
    const [start, end] = visibleRange.map((dateStr) => new Date(dateStr));
    console.log("Visible Range (Date Objects):", start, end);
    const visibleData = filteredData.filter((d) => {
      const date = new Date(d.date);
      return date >= start && date <= end;
    });
    console.log("Visible Data Count:", visibleData.length);
    if (visibleData.length === 0) {
      console.warn(
        "No data visible in the current range. Setting default Y-Axis Range."
      );
      return [0, 100]; // Default range if no data is visible
    }
    const maxRequest = Math.max(...visibleData.map((d) => d.totalRequests), 0);
    const calculatedRange =
      maxRequest > 0 ? [0, Math.ceil(maxRequest * 1.1)] : [0, 100];
    console.log("Calculated Y-Axis Range:", calculatedRange);
    return calculatedRange; // 10% buffer
  }, [visibleRange, filteredData]);

  // **Refresh Data Function (Already exists, kept for completeness)**
  const refreshData = () => {
    loadData();
  };

  // Determine responsive font sizes and control sizes
  const controlFontSize = useBreakpointValue({ base: "sm", md: "md" });
  const controlPadding = useBreakpointValue({ base: 2, md: 4 });
  const buttonSize = useBreakpointValue({ base: "sm", md: "md" });

  return (
    <Box
      p={5}
      bg="radial-gradient(circle, #000000 0%, #7800ff 100%)"
      minH="100vh"
      color="white"
      display="flex"
      flexDirection="column"
      alignItems="center" // Center child components horizontally
      overflow="hidden" // Prevent overall overflow
      width="100%" // Ensure the Box takes full width
    >
      {/* Single Container Box for All Elements */}
      <Box
        bg="rgba(255, 255, 255, 0.1)"
        borderRadius="md"
        p={6}
        boxShadow="lg"
        width="100%"
        maxW="1600px" // Maximum width to constrain on larger screens
      >
        <Flex
          direction={{ base: "column", md: "column" }} // Always column to stack controls on top
          justifyContent="space-between"
          alignItems="stretch"
          gap={6}
        >
          {/* Controls Section */}
          <Flex
            direction={{ base: "column", md: "row" }}
            justifyContent="flex-start"
            alignItems={{ base: "flex-start", md: "center" }}
            gap={4}
            wrap="wrap"
          >
            {/* Primary Day Selection */}
            <FormControl size="sm" maxW="200px">
              <FormLabel fontSize={controlFontSize} mb={1}>
                Select Day:
              </FormLabel>
              <Select
                placeholder="All Days"
                value={selectedDay}
                onChange={handleDayChange}
                size="sm"
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
            <Button
              onClick={toggleCompare}
              colorScheme={isComparing ? "teal" : "gray"}
              variant={isComparing ? "solid" : "outline"}
              size="sm"
            >
              {isComparing ? "Cancel Compare" : "Compare"}
            </Button>

            {/* Secondary Day Selection for Comparison */}
            {isComparing && (
              <FormControl size="sm" maxW="200px">
                <FormLabel fontSize={controlFontSize} mb={1}>
                  Compare with:
                </FormLabel>
                <Select
                  placeholder="Select Day"
                  value={compareDay}
                  onChange={handleCompareDayChange}
                  size="sm"
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
              </FormControl>
            )}

            {/* Refresh Button */}
            <Button
              onClick={refreshData}
              colorScheme="blue"
              variant="solid"
              size="sm"
            >
              Refresh Data
            </Button>
          </Flex>

          {/* Chart Section */}
          <Box width="100%">
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Text fontSize={{ base: "lg", md: "xl" }} textAlign="center">
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
              <Flex justifyContent="center" alignItems="center" height="300px">
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
              <Box
                overflow="auto"
                width="100%"
                height={{ base: "400px", md: "600px" }}
              >
                <Plot
                  data={traces}
                  layout={{
                    autosize: true,
                    height: "100%", // Full height of the container
                    margin: { l: 80, r: 30, t: 60, b: 150 }, // Increased bottom margin for x-axis labels
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
                      range: visibleRange.map((dateStr) =>
                        new Date(dateStr).toISOString()
                      ), // Ensure ISO format
                      rangeslider: {
                        visible: true,
                        bgcolor: "rgba(0, 0, 0, 0)", // Set background to transparent
                        thickness: 0.15, // Thickness of the slider
                        range:
                          aggregatedData.length > 0
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
                      tickmode:
                        monthTicks.tickVals.length > 0 ? "array" : "auto",
                      tickvals:
                        monthTicks.tickVals.length > 0
                          ? monthTicks.tickVals
                          : undefined,
                      ticktext:
                        monthTicks.tickTexts.length > 0
                          ? monthTicks.tickTexts
                          : undefined,
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
                  useResizeHandler={true}
                  style={{ width: "100%", height: "100%" }} // Make Plot responsive
                  onRelayout={handleRelayout} // Handle relayout events
                />
              </Box>
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  );
};

export default RequestCountGraph;
