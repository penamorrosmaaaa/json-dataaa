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

  // State for y-axis range
  const [yAxisRange, setYAxisRange] = useState([0, 100]); // Initialize with a default range

  // States for day filters
  const [selectedDay, setSelectedDay] = useState(""); // Changed from "All" to ""
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

      // Aggregate data: sum request counts per date and collect notable events
      const aggregationMap = {};

      dataRows.forEach((row, index) => {
        const dateStr = row["Date"]?.trim();
        const requestCountStr = row["Request Count"]?.trim();
        const notableEvent = row["Notable Events"]?.trim(); // **New: Capture Notable Events**

        if (!dateStr || !requestCountStr) {
          console.warn(
            `Skipping row ${index + 2} due to missing date or request count.`
          );
          return;
        }

        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(year, month - 1, day);

        if (isNaN(date.getTime())) {
          console.warn(`Invalid date on row ${index + 2}: ${dateStr}`);
          return;
        }

        const requestCount = parseInt(requestCountStr, 10);

        if (isNaN(requestCount)) {
          console.warn(
            `Invalid request count on row ${index + 2}: ${requestCountStr}`
          );
          return;
        }

        const dateKey = date.toISOString().split("T")[0];

        if (!aggregationMap[dateKey]) {
          aggregationMap[dateKey] = { totalRequests: 0, events: [] }; // **Initialize with events array**
        }

        aggregationMap[dateKey].totalRequests += requestCount;

        if (notableEvent) {
          aggregationMap[dateKey].events.push(notableEvent); // **Collect events**
        }
      });

      // Convert aggregation map to array and sort by date ascendingly
      const mappedData = Object.keys(aggregationMap)
        .map((date) => ({
          date,
          totalRequests: aggregationMap[date].totalRequests,
          events: aggregationMap[date].events, // **Include events in mapped data**
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

  // Function to filter data based on selected days
  const getFilteredData = () => {
    if (selectedDay === "" && !isComparing) { // Changed from "All" to ""
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

    if (selectedDay !== "") { // Changed from "All"
      const dayNumber = daysMap[selectedDay];
      filtered = filtered.filter((d) => {
        const [year, month, day] = d.date.split("-").map(Number);
        const date = new Date(year, month - 1, day); // Local time
        const dayOfWeek = date.getDay();
        return dayOfWeek === dayNumber;
      });
    }

    if (isComparing && compareDay !== "") {
      const compareDayNumber = daysMap[compareDay];
      const comparisonData = aggregatedData.filter((d) => {
        const [year, month, day] = d.date.split("-").map(Number);
        const date = new Date(year, month - 1, day); // Local time
        const dayOfWeek = date.getDay();
        return dayOfWeek === compareDayNumber;
      });
      filtered = [...filtered, ...comparisonData];
    }

    return filtered;
  };

  const filteredData = useMemo(
    () => getFilteredData(),
    [aggregatedData, selectedDay, isComparing, compareDay]
  );

  // Memo: Calculate Monthly Tick Values and Labels Based on Filtered Data
  const monthTicks = useMemo(() => {
    const ticks = [];
    const labels = [];
    const seenMonths = new Set();

    filteredData.forEach((d) => {
      const [year, month, day] = d.date.split("-").map(Number);
      const date = new Date(year, month - 1, day); // Local time
      const monthKey = `${date.getMonth()}-${date.getFullYear()}`;

      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        const isoDate = date.toISOString().split("T")[0]; // "YYYY-MM-DD"
        ticks.push(isoDate);
        labels.push(
          date.toLocaleString("default", { month: "short", year: "numeric" })
        );
      }
    });

    return { tickVals: ticks, tickTexts: labels };
  }, [filteredData]);

  // Prepare data traces for Plotly
  const prepareTraces = () => {
    const traces = [];

    if (isComparing && compareDay !== "" && selectedDay !== "") { // Changed from "All" to ""
      const daysMap = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };

      const primaryData = aggregatedData.filter((d) => {
        const [year, month, day] = d.date.split("-").map(Number);
        const date = new Date(year, month - 1, day); // Local time
        const dayOfWeek = date.getDay();
        return dayOfWeek === daysMap[selectedDay];
      });

      const comparisonData = aggregatedData.filter((d) => {
        const [year, month, day] = d.date.split("-").map(Number);
        const date = new Date(year, month - 1, day); // Local time
        const dayOfWeek = date.getDay();
        return dayOfWeek === daysMap[compareDay];
      });

      // Create maps for easy lookup
      const primaryMap = new Map(
        primaryData.map((d) => [d.date, d.totalRequests])
      );
      const comparisonMap = new Map(
        comparisonData.map((d) => [d.date, d.totalRequests])
      );

      // Create a sorted list of all unique dates from both datasets
      const allDatesSet = new Set([...primaryMap.keys(), ...comparisonMap.keys()]);
      const allDates = Array.from(allDatesSet).sort(
        (a, b) => new Date(a) - new Date(b)
      );

      // Create y-values aligned to allDates
      const primaryY = allDates.map((date) => primaryMap.get(date) || 0);
      const comparisonY = allDates.map((date) => comparisonMap.get(date) || 0);

      // Customdata for events
      const primaryEvents = primaryData.map((d) =>
        d.events.length > 0 ? d.events.join("<br>") : ""
      );
      const comparisonEvents = comparisonData.map((d) =>
        d.events.length > 0 ? d.events.join("<br>") : ""
      );

      traces.push(
        {
          x: allDates,
          y: primaryY,
          type: "bar",
          name: selectedDay === "" ? "All Days" : selectedDay, // Updated name
          marker: {
            color: "#0074D9",
            line: {
              color: "#ffffff",
              width: 0.5,
            },
          },
          customdata: primaryEvents,
          hovertemplate:
            "%{x|%d-%b-%Y}<br>Total Requests: %{y}<br>" +
            "Events:<br>%{customdata}<extra></extra>",
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
          customdata: comparisonEvents,
          hovertemplate:
            "%{x|%d-%b-%Y}<br>Total Requests: %{y}<br>" +
            "Events:<br>%{customdata}<extra></extra>",
        }
      );

      // Add scatter trace for Notable Events (Yellow Circles)
      const eventData = [...primaryData, ...comparisonData].filter(
        (d) => d.events.length > 0
      );

      if (eventData.length > 0) {
        const eventDates = eventData.map((d) => d.date);
        const eventY = eventData.map((d) => d.totalRequests);
        const eventHoverTexts = eventData.map((d) => d.events.join("<br>"));

        traces.push({
          x: eventDates,
          y: eventY,
          type: "scatter",
          mode: "markers",
          name: "Notable Events",
          marker: {
            symbol: "circle",
            size: 10, // Fixed size to prevent excessive scaling
            color: "yellow",
            line: {
              color: "black",
              width: 1,
            },
          },
          hoverinfo: "text",
          hovertext: eventHoverTexts,
        });
      }
    } else {
      // Single trace
      traces.push({
        x: filteredData.map((d) => d.date),
        y: filteredData.map((d) => d.totalRequests),
        type: "bar",
        marker: {
          color:
            selectedDay === ""
              ? filteredData.map((d) => {
                  const [year, month, day] = d.date.split("-").map(Number);
                  const date = new Date(year, month - 1, day);
                  const dayOfWeek = date.getDay();
                  return dayOfWeek === 0 ? "#FF4136" : "#0074D9"; // **Red for Sundays, Blue otherwise**
                })
              : "#0074D9",
          line: {
            color: "#ffffff",
            width: 0.5,
          },
        },
        customdata: filteredData.map((d) =>
          d.events.length > 0 ? d.events.join("<br>") : ""
        ),
        hovertemplate:
          "%{x|%d-%b-%Y}<br>Total Requests: %{y}<br>" +
          "Events:<br>%{customdata}<extra></extra>",
        name: selectedDay === "" ? "All Days" : "Total Requests", // Updated name
      });
    }

    return traces;
  };

  const traces = useMemo(
    () => prepareTraces(),
    [filteredData, isComparing, compareDay, selectedDay, aggregatedData]
  );

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

      // Convert string dates to Date objects
      const startDate = new Date(newStart);
      const endDate = new Date(newEnd);

      // Filter the data within the new visible range
      const visibleData = filteredData.filter((d) => {
        const date = new Date(d.date);
        return date >= startDate && date <= endDate;
      });

      // Find the maximum y-value in the visible data
      const maxY = Math.max(...visibleData.map((d) => d.totalRequests), 0);

      // Set the y-axis range with a 10% buffer
      const newYRange = [0, maxY > 0 ? maxY * 1.1 : 100];
      console.log("Calculated Y-Axis Range:", newYRange);
      setYAxisRange(newYRange);
    }
  };

  // Effect to Update Y-Axis Range When Data or Visible Range Changes
  useEffect(() => {
    if (filteredData.length === 0) {
      setYAxisRange([0, 100]);
      return;
    }

    const [startStr, endStr] = visibleRange;
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);

    const visibleData = filteredData.filter((d) => {
      const date = new Date(d.date);
      return date >= startDate && date <= endDate;
    });

    const maxRequest = Math.max(...visibleData.map((d) => d.totalRequests), 0);
    const calculatedRange = maxRequest > 0 ? [0, maxRequest * 1.1] : [0, 100];
    console.log("Calculated Y-Axis Range from useEffect:", calculatedRange);
    setYAxisRange(calculatedRange);
  }, [visibleRange, filteredData]);

  // Function to determine the title based on the visible range and comparison
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

  // Handlers for dropdowns and buttons
  const handleDayChange = (e) => {
    setSelectedDay(e.target.value);
    // Reset compare selection when primary selection changes
    if (!isComparing) {
      setVisibleRange([sixMonthsAgo, currentDate]);
    }
  };

  const handleCompareDayChange = (e) => {
    setCompareDay(e.target.value);
    setVisibleRange([sixMonthsAgo, currentDate]);
  };

  const toggleCompare = () => {
    setIsComparing(!isComparing);
    // Reset compareDay when disabling compare mode
    if (isComparing) {
      setCompareDay("");
    }
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
    >
      <Flex direction="column" width={{ base: "100%", md: "90%" }} maxW="1200px">
        {/* Integrated Controls and Main Chart Section */}
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)" // Changed to linear gradient
          borderRadius="20px" // Adjust border-radius as desired
          p={4} // **Preserved original padding**
          boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Optional: adds a shiny glow effect
          width="100%"
          display="flex"
          flexDirection="column"
          gap={6} // **Space between controls and chart**
          border="5px solid" // Adjust border thickness as needed
          borderColor="rgba(255, 255, 255, 0.8)" // White with slight transparency for a shiny effect
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
                placeholder="All Days" // Changed from "All Days" to "Select Day"
                value={selectedDay}
                onChange={handleDayChange}
                maxW="200px"
                bg="white"
                color="black"
              >
                {/* Removed the "All Days" option */}
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
                colorScheme={isComparing ? "green" : "blue"} // **Changed colorScheme for better visibility**
                variant={isComparing ? "solid" : "outline"}
                bg={isComparing ? "green.400" : "blue.200"} // **Added explicit bg for better contrast**
                _hover={{
                  bg: isComparing ? "green.500" : "blue.300",
                }}
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
          </Flex>

          {/* Main Chart */}
          <Box>
            <Flex justifyContent="space-between" alignItems="center" mb={6}>
              <Text fontSize="2xl" textAlign="center">
                {isLoading || error ? "Request Count Over Time" : getTitle()}
              </Text>
            </Flex>
            {isLoading ? (
              <Flex justifyContent="center" alignItems="center" height="600px">
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
                  hovermode: "closest", // **Ensure hover mode is set to closest**
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
