/* src/NewPage/NewPage.js */

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  Button,
  Select,
  Grid,
  Checkbox,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Tag,
  TagLabel,
  TagCloseButton,
  Collapse,
  Link,
} from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import Papa from "papaparse";
import Plot from "react-plotly.js";

// Mapping of Spanish abbreviated month names to month numbers
const monthMap = {
  Ene: 0,
  Feb: 1,
  Mar: 2,
  Abr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Ago: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dic: 11,
};

// Helper function to parse date strings like "12Ene2024" to Date objects
const parseDateString = (dateStr) => {
  const regex = /^(\d{1,2})([A-Za-z]{3})(\d{4})$/;
  const match = dateStr.match(regex);
  if (!match) return null;
  const [, day, monthAbbr, year] = match;
  const month = monthMap[monthAbbr];
  if (month === undefined) return null;
  return new Date(year, month, day);
};

// Helper function to format numbers with commas and no decimals
const formatNumber = (number) => {
  return Number(number).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const NewPage = () => {
  const [primaryCsvData, setPrimaryCsvData] = useState([]); // [{ url: '', category: '', detail: '', originalSheetUrl: '', aprovisionamiento: '' }, ...]
  const [eventData, setEventData] = useState([]); // Aggregated event data from all CSVs
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("All"); // For Distribution Section
  const [selectedGraphOption, setSelectedGraphOption] = useState("TOTAL");

  const [selectedEvents, setSelectedEvents] = useState([]); // For customizable line graph
  const [selectedRow, setSelectedRow] = useState(null); // For detailed event view

  const [isTableExpanded, setIsTableExpanded] = useState(false); // Toggle table expansion
  const [isPieChartVisible, setIsPieChartVisible] = useState(false); // Toggle pie chart visibility

  const [tableCategoryFilter, setTableCategoryFilter] = useState("All"); // Table-specific category filter
  const [compareMode, setCompareMode] = useState(false); // Toggle compare mode
  const [selectedCompareEvents, setSelectedCompareEvents] = useState([]); // Events selected for comparison

  const toast = useToast();

  // Google Sheets CSV URL (Primary CSV)
  const PRIMARY_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTeNhucRAFXnawnxWxk04bw2zEjcA23dstfybACBwTM5GVrnCsEZ7KyoI2vPdCbtnwUmEF6_dV-qEsV/pub?output=csv";

  // Helper function to fetch and process CSV data
  const fetchCSVData = async (csvUrl) => {
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        console.error("CSV Parsing Errors:", parsed.errors);
        throw new Error("Error parsing CSV data.");
      }
      return parsed.data; // Array of rows
    } catch (error) {
      console.error("Error fetching CSV:", error);
      throw error;
    }
  };

  // Fetch primary CSV (links, categories, details, original sheet URLs, and aprovisionamiento) and then fetch event data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch primary CSV
        const primaryData = await fetchCSVData(PRIMARY_CSV_URL);
        // Assuming the first row is headers, skip it
        const linksAndCategories = primaryData.slice(1).map((row) => ({
          url: row[0]?.trim(),
          category: row[1]?.trim(),
          detail: row[2]?.trim(),
          originalSheetUrl: row[3]?.trim(), // Column D
          aprovisionamiento: row[4]?.trim(), // Column E (new)
        })).filter(link => link.url); // Filter out empty URLs

        setPrimaryCsvData(linksAndCategories);

        const allEventData = [];

        // Iterate over each link and fetch its event data
        for (const linkObj of linksAndCategories) {
          const { url, category, detail, originalSheetUrl, aprovisionamiento } = linkObj;
          try {
            const data = await fetchCSVData(url);
            // Validate data length
            if (data.length < 10) { // Adjusted based on CSV structure
              console.warn(`CSV at ${url} does not have enough rows.`);
              continue;
            }

            // Extract Event Title and Date from A2 (Row 2, Column A)
            const eventTitleRow = data[1]; // 0-indexed: A2 is row 1
            const eventTitle = eventTitleRow[0] || "N/A"; // Column A is index 0
            const [eventName, eventDateStr] = eventTitle.split(" - ").map((str) => str.trim());

            // Parse the event date
            const eventDate = parseDateString(eventDateStr);
            if (!eventDate) {
              console.warn(`Invalid date format in CSV at ${url}: "${eventDateStr}"`);
            }

            // Get CTV from B5 (Row 5, Column B)
            const ctvValue = data[4][1]; // Row 5 is index 4, Column B is index 1
            const cleanedCtvValue = ctvValue.replace(/,/g, '');
            const ctvCount = parseFloat(cleanedCtvValue) || 0;

            // Sum B6:B9 (APPS) - Rows 6 to 9 are indices 5 to 8
            let appsSum = 0;
            for (let i = 5; i <= 8; i++) { // Corrected loop range
              const appValue = data[i][1]; // Column B is index 1
              // Remove commas and parse as float
              const cleanedValue = appValue.replace(/,/g, '');
              const parsedValue = parseFloat(cleanedValue);
              if (!isNaN(parsedValue)) {
                appsSum += parsedValue;
              }
            }

            // Get B10 (SITE) - Row 10 is index 9
            const siteValue = data[9][1]; // Column B is index 1
            const cleanedSiteValue = siteValue.replace(/,/g, '');
            const siteCount = parseFloat(cleanedSiteValue) || 0;

            // Calculate SUBTOTAL and TOTAL
            const subtotal = appsSum + siteCount;
            const total = subtotal + ctvCount;

            allEventData.push({
              id: `${eventName}-${eventDateStr}-${category}`, // Unique identifier
              url: url,
              category: category,
              detail: detail || "", // From Column C
              originalSheetUrl: originalSheetUrl || "", // From Column D
              aprovisionamiento: aprovisionamiento || "-", // From Column E (new)
              eventName: eventName || "N/A",
              eventDate: eventDate ? eventDate.toISOString().split("T")[0] : "N/A", // Format as YYYY-MM-DD
              ctv: ctvCount,
              apps: appsSum,
              site: siteCount,
              subtotal: subtotal,
              total: total,
            });
          } catch (err) {
            console.error(`Error processing CSV at ${linkObj.url}:`, err);
            continue; // Skip this link and continue with others
          }
        }

        // Sort allEventData based on eventDate descending
        allEventData.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
        setEventData(allEventData);
      } catch (err) {
        setError(err.message);
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [PRIMARY_CSV_URL, toast]);

  // Filtering data for Distribution Section based on selectedCategory
  const distributionFilteredData = useMemo(() => {
    let data = [...eventData];
    if (selectedCategory !== "All") {
      data = data.filter((d) => d.category === selectedCategory);
    }
    return data;
  }, [eventData, selectedCategory]);

  // Filtering data for Events Table based on tableCategoryFilter
  const tableFilteredData = useMemo(() => {
    let data = [...eventData];
    return data.filter(
      (row) =>
        tableCategoryFilter === "All" || row.category === tableCategoryFilter
    );
  }, [eventData, tableCategoryFilter]);

  // Aggregated statistics for Distribution Section
  const totalApps = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.apps, 0);
  }, [distributionFilteredData]);

  const totalSites = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.site, 0);
  }, [distributionFilteredData]);

  const totalCtv = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.ctv, 0);
  }, [distributionFilteredData]);

  const totalSubtotal = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.subtotal, 0);
  }, [distributionFilteredData]);

  const totalTotal = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.total, 0);
  }, [distributionFilteredData]);

  // Calculate SUBTOTAL and TOTAL averages for Distribution Section
  const averageSubtotal = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(distributionFilteredData.reduce((sum, d) => sum + d.subtotal, 0) / distributionFilteredData.length);
  }, [distributionFilteredData]);

  const averageTotal = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(distributionFilteredData.reduce((sum, d) => sum + d.total, 0) / distributionFilteredData.length);
  }, [distributionFilteredData]);

  // Prepare data for Pie Chart (Distribution Section)
  const pieData = useMemo(() => {
    return [
      {
        values: [totalApps, totalSites, totalCtv],
        labels: ["APPS'", "SITE", "CTV"],
        type: "pie",
        marker: {
          colors: ["#36a2eb", "#ff6384", "#ffce56"],
        },
        hoverinfo: "label+percent",
        textinfo: "label+value",
        textposition: "inside",
        textfont: {
          color: "white",
          size: 14,
          family: "Arial",
          weight: "bold",
        },
      },
    ];
  }, [totalApps, totalSites, totalCtv]);

  // Prepare data for Average Displays (Distribution Section)
  const averageApps = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(totalApps / distributionFilteredData.length);
  }, [totalApps, distributionFilteredData]);

  const averageSites = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(totalSites / distributionFilteredData.length);
  }, [totalSites, distributionFilteredData]);

  const averageCtv = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(totalCtv / distributionFilteredData.length);
  }, [totalCtv, distributionFilteredData]);

  // Prepare data for Line Graph (Events Over Time)
  const lineGraphData = useMemo(() => {
    // Each event is a point on the graph, connected in the order they appear
    const eventsSorted = [...eventData].sort(
      (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
    );

    const months = eventsSorted.map((d) => d.eventDate);
    const APPS = eventsSorted.map((d) => d.apps);
    const SITE = eventsSorted.map((d) => d.site);
    const CTV = eventsSorted.map((d) => d.ctv);
    const SUBTOTAL = eventsSorted.map((d) => d.subtotal);
    const TOTAL = eventsSorted.map((d) => d.total);

    return {
      months,
      APPS,
      SITE,
      CTV,
      SUBTOTAL,
      TOTAL,
      events: eventsSorted,
    };
  }, [eventData]);

  // Handler for row selection in the table
  const handleRowClick = (row) => {
    if (selectedRow && selectedRow.id === row.id) {
      // If the same row is clicked again, hide the pie chart
      setSelectedRow(null);
      setIsPieChartVisible(false);
    } else {
      // Show the pie chart for the clicked row
      setSelectedRow(row);
      setIsPieChartVisible(true);
    }
  };

  // Handler for selecting events via dropdown in line graph
  const handleEventSelection = (e) => {
    const selectedEventId = e.target.value;
    if (selectedEventId && !selectedEvents.includes(selectedEventId)) {
      setSelectedEvents([...selectedEvents, selectedEventId]);
    }
  };

  // Handler to remove a selected event from line graph
  const handleRemoveSelectedEvent = (eventId) => {
    setSelectedEvents(selectedEvents.filter((id) => id !== eventId));
  };

  // Handler for selecting events for comparison
  const handleCompareSelection = (eventId) => {
    if (selectedCompareEvents.includes(eventId)) {
      setSelectedCompareEvents(selectedCompareEvents.filter((id) => id !== eventId));
    } else {
      setSelectedCompareEvents([...selectedCompareEvents, eventId]);
    }
  };

  // Handler to initiate comparison
  const handleCompare = () => {
    if (selectedCompareEvents.length < 2) {
      toast({
        title: "Insufficient Selection",
        description: "Please select at least two events to compare.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setCompareMode(true);
  };

  // Handler to cancel comparison
  const handleCancelCompare = () => {
    setCompareMode(false);
    setSelectedCompareEvents([]);
  };

  // Determine the data to display in the line graph based on dropdown selection
  const lineGraphDisplayData = useMemo(() => {
    if (selectedGraphOption === "APPS") {
      return {
        y: lineGraphData.APPS,
        name: "APPS'",
        color: "#36a2eb",
      };
    } else if (selectedGraphOption === "SITE") {
      return {
        y: lineGraphData.SITE,
        name: "SITE",
        color: "#ff6384",
      };
    } else if (selectedGraphOption === "CTV") {
      return {
        y: lineGraphData.CTV,
        name: "CTV",
        color: "#ffce56",
      };
    } else if (selectedGraphOption === "SUBTOTAL") {
      return {
        y: lineGraphData.SUBTOTAL,
        name: "SUBTOTAL (APPS + SITE)",
        color: "#4BC0C0",
      };
    } else {
      return {
        y: lineGraphData.TOTAL,
        name: "TOTAL (SUBTOTAL + CTV)",
        color: "#9966FF",
      };
    }
  }, [lineGraphData, selectedGraphOption]);

  // Get the 10 most recent events
  const recentEvents = useMemo(() => {
    return eventData.slice(0, 10);
  }, [eventData]);

  // Prepare filtered line graph data based on selected events
  const filteredLineGraphData = useMemo(() => {
    if (selectedEvents.length === 0) {
      // If no events selected, display all
      return {
        x: lineGraphData.months,
        y: lineGraphDisplayData.y,
        name: lineGraphDisplayData.name,
        color: lineGraphDisplayData.color,
      };
    }
    // Filter events based on selectedEvents
    const filteredEvents = lineGraphData.events.filter((event) =>
      selectedEvents.includes(event.id)
    );

    const xData = filteredEvents.map((d) => d.eventDate);
    const yData = filteredEvents.map((d) => {
      if (selectedGraphOption === "APPS") return d.apps;
      if (selectedGraphOption === "SITE") return d.site;
      if (selectedGraphOption === "CTV") return d.ctv;
      if (selectedGraphOption === "SUBTOTAL") return d.subtotal;
      return d.total;
    });

    return {
      x: xData,
      y: yData,
      name: lineGraphDisplayData.name,
      color: lineGraphDisplayData.color,
    };
  }, [selectedEvents, lineGraphDisplayData, lineGraphData.events, selectedGraphOption]);

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    if (selectedCompareEvents.length < 2) return null;

    const eventsToCompare = eventData.filter((event) =>
      selectedCompareEvents.includes(event.id)
    );

    // Calculate percentage changes between the first event and the others
    const baseEvent = eventsToCompare[0];
    const comparisons = eventsToCompare.slice(1).map((event) => {
      const appsChange =
        baseEvent.apps === 0
          ? 0
          : ((event.apps - baseEvent.apps) / baseEvent.apps) * 100;
      const siteChange =
        baseEvent.site === 0
          ? 0
          : ((event.site - baseEvent.site) / baseEvent.site) * 100;
      const ctvChange =
        baseEvent.ctv === 0
          ? 0
          : ((event.ctv - baseEvent.ctv) / baseEvent.ctv) * 100;
      const subtotalChange =
        baseEvent.subtotal === 0
          ? 0
          : ((event.subtotal - baseEvent.subtotal) / baseEvent.subtotal) * 100;
      const totalChange =
        baseEvent.total === 0
          ? 0
          : ((event.total - baseEvent.total) / baseEvent.total) * 100;

      return {
        eventName: event.eventName,
        eventDate: event.eventDate,
        appsChange: appsChange.toFixed(0), // Remove decimals
        siteChange: siteChange.toFixed(0), // Remove decimals
        ctvChange: ctvChange.toFixed(0),   // Remove decimals
        subtotalChange: subtotalChange.toFixed(0),
        totalChange: totalChange.toFixed(0),
      };
    });

    return {
      baseEvent,
      comparisons,
    };
  }, [selectedCompareEvents, eventData]);

  return (
    <Box p={5} color="white" bg="gray.800" minH="100vh">
      {/* Events Table at the Top */}
      {!isLoading && !error && (
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)"
          borderRadius="20px"
          p={6}
          border="5px solid rgba(255, 255, 255, 0.8)"
          boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
          mb={6}
        >
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Text fontSize="lg" fontWeight="bold" color="white">
              Events Table
            </Text>
            <Flex gap={2}>
              <Select
                placeholder="Filter Category"
                value={tableCategoryFilter}
                onChange={(e) => setTableCategoryFilter(e.target.value)}
                bg="white"
                color="black"
                size="sm"
                width="200px"
              >
                <option value="All">All</option>
                <option value="LigaMX">LigaMX</option>
                <option value="Politics">Politics</option>
                <option value="Other">Other</option>
              </Select>
              <Button
                colorScheme={compareMode ? "red" : "teal"}
                onClick={compareMode ? handleCancelCompare : handleCompare}
                size="sm"
                isDisabled={selectedCompareEvents.length < 2 && !compareMode}
              >
                {compareMode ? "Cancel Compare" : "Compare"}
              </Button>
            </Flex>
          </Flex>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th fontSize="sm">Select</Th>
                <Th fontSize="sm">Date</Th>
                <Th fontSize="sm">Event Name</Th>
                <Th fontSize="sm">DETAILS</Th>
                <Th isNumeric fontSize="sm">
                  SITE
                </Th>
                <Th isNumeric fontSize="sm">
                  APPS'
                </Th>
                <Th isNumeric fontSize="sm">
                  CTV
                </Th>
                <Th isNumeric fontSize="sm">
                  SUBTOTAL
                </Th>
                <Th isNumeric fontSize="sm">
                  TOTAL
                </Th>
                <Th isNumeric fontSize="sm">
                  Aprov. {/* New Column Header */}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {tableFilteredData.map((row) => (
                <Tr
                  key={row.id}
                  bg={
                    row.category === "LigaMX"
                      ? "blue.600"
                      : row.category === "Politics"
                      ? "green.600"
                      : "purple.600"
                  }
                  _hover={{ bg: "gray.600", cursor: "pointer" }}
                  onClick={() => handleRowClick(row)}
                  fontSize="xs"
                  height="40px"
                >
                  <Td>
                    <Checkbox
                      isChecked={selectedCompareEvents.includes(row.id)}
                      onChange={() => handleCompareSelection(row.id)}
                      onClick={(e) => e.stopPropagation()} // Prevent triggering row click
                    />
                  </Td>
                  <Td>{row.eventDate}</Td>
                  <Td>
                    {row.originalSheetUrl ? (
                      <Link
                        href={row.originalSheetUrl}
                        isExternal
                        color="teal.200"
                        textDecoration="underline"
                        _hover={{ color: "teal.400" }}
                      >
                        {row.eventName}
                      </Link>
                    ) : (
                      row.eventName
                    )}
                  </Td>
                  <Td>
                    {row.detail}
                  </Td>
                  <Td isNumeric>{formatNumber(row.site)}</Td>
                  <Td isNumeric>{formatNumber(row.apps)}</Td>
                  <Td isNumeric>{formatNumber(row.ctv)}</Td>
                  <Td isNumeric>{formatNumber(row.subtotal)}</Td>
                  <Td isNumeric>{formatNumber(row.total)}</Td>
                  <Td isNumeric>{row.aprovisionamiento}</Td> {/* Display Aprovisionamiento */}
                </Tr>
              ))}
            </Tbody>
          </Table>
          {/* Toggle Button to Expand/Collapse Table */}
          {tableFilteredData.length > 10 && (
            <Flex justifyContent="center" mt={2}>
              <Button
                size="xs"
                onClick={() => setIsTableExpanded(!isTableExpanded)}
                leftIcon={isTableExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                colorScheme="teal"
              >
                {isTableExpanded ? "Show Less" : "Show All"}
              </Button>
            </Flex>
          )}

          {/* Detailed Pie Chart for Selected Row */}
          <Collapse in={isPieChartVisible} animateOpacity>
            {selectedRow && (
              <Box
                mt={4}
                bg="linear-gradient(90deg, #000000, #7800ff)"
                borderRadius="20px"
                p={6}
                border="5px solid rgba(255, 255, 255, 0.8)"
                boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
              >
                <Text fontSize="sm" mb={2} textAlign="center" color="white" fontWeight="bold">
                  Distribution for {selectedRow.eventName} on {selectedRow.eventDate}
                </Text>
                <Flex justifyContent="center">
                  <Plot
                    data={[
                      {
                        values: [selectedRow.apps, selectedRow.site, selectedRow.ctv],
                        labels: ["APPS'", "SITE", "CTV"],
                        type: "pie",
                        marker: {
                          colors: ["#36a2eb", "#ff6384", "#ffce56"],
                        },
                        hoverinfo: "label+percent",
                        textinfo: "label+value",
                        textposition: "inside",
                        textfont: {
                          color: "white",
                          size: 14,
                          family: "Arial",
                          weight: "bold",
                        },
                      },
                    ]}
                    layout={{
                      width: 600, // Increased size
                      height: 600, // Increased size
                      paper_bgcolor: "transparent",
                      plot_bgcolor: "transparent",
                      showlegend: true,
                      legend: { orientation: "h", x: 0.3, y: -0.2 },
                    }}
                    config={{ displayModeBar: false }}
                  />
                </Flex>
              </Box>
            )}
          </Collapse>

          {/* Comparison Section - Positioned Above Pie Chart */}
          {compareMode && comparisonData && (
            <Box
              bg="linear-gradient(90deg, #000000, #7800ff)"
              borderRadius="20px"
              p={6}
              border="5px solid rgba(255, 255, 255, 0.8)"
              boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
              mb={6}
            >
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text fontSize="lg" fontWeight="bold" color="white">
                  Comparison
                </Text>
                <Button
                  colorScheme="red"
                  onClick={handleCancelCompare}
                  size="sm"
                >
                  Cancel
                </Button>
              </Flex>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th fontSize="sm">Event Name</Th>
                    <Th fontSize="sm">APPS' Count</Th>
                    <Th fontSize="sm">SITE Count</Th>
                    <Th fontSize="sm">CTV Count</Th>
                    <Th fontSize="sm">SUBTOTAL Count</Th>
                    <Th fontSize="sm">TOTAL Count</Th>
                    <Th fontSize="sm">APPS' Change (%)</Th>
                    <Th fontSize="sm">SITE Change (%)</Th>
                    <Th fontSize="sm">CTV Change (%)</Th>
                    <Th fontSize="sm">SUBTOTAL Change (%)</Th>
                    <Th fontSize="sm">TOTAL Change (%)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td fontWeight="bold" color="white">
                      {comparisonData.baseEvent.eventName} - {comparisonData.baseEvent.eventDate}
                    </Td>
                    <Td isNumeric>{formatNumber(comparisonData.baseEvent.apps)}</Td>
                    <Td isNumeric>{formatNumber(comparisonData.baseEvent.site)}</Td>
                    <Td isNumeric>{formatNumber(comparisonData.baseEvent.ctv)}</Td>
                    <Td isNumeric>{formatNumber(comparisonData.baseEvent.subtotal)}</Td>
                    <Td isNumeric>{formatNumber(comparisonData.baseEvent.total)}</Td>
                    <Td color="gray.400">-</Td>
                    <Td color="gray.400">-</Td>
                    <Td color="gray.400">-</Td>
                    <Td color="gray.400">-</Td>
                    <Td color="gray.400">-</Td>
                  </Tr>
                  {comparisonData.comparisons.map((comp, index) => {
                    const appsChangePositive = parseFloat(comp.appsChange) >= 0;
                    const siteChangePositive = parseFloat(comp.siteChange) >= 0;
                    const ctvChangePositive = parseFloat(comp.ctvChange) >= 0;
                    const subtotalChangePositive = parseFloat(comp.subtotalChange) >= 0;
                    const totalChangePositive = parseFloat(comp.totalChange) >= 0;

                    // Find the event to get accurate counts
                    const event = eventData.find(e => e.id === selectedCompareEvents[index + 1]);

                    return (
                      <Tr key={index}>
                        <Td fontWeight="bold" color="white">
                          {event && event.originalSheetUrl ? (
                            <Link
                              href={event.originalSheetUrl}
                              isExternal
                              color="teal.200"
                              textDecoration="underline"
                              _hover={{ color: "teal.400" }}
                            >
                              {comp.eventName} - {comp.eventDate}
                            </Link>
                          ) : (
                            `${comp.eventName} - ${comp.eventDate}`
                          )}
                        </Td>
                        <Td isNumeric>{formatNumber(event?.apps || 0)}</Td>
                        <Td isNumeric>{formatNumber(event?.site || 0)}</Td>
                        <Td isNumeric>{formatNumber(event?.ctv || 0)}</Td>
                        <Td isNumeric>{formatNumber(event?.subtotal || 0)}</Td>
                        <Td isNumeric>{formatNumber(event?.total || 0)}</Td>
                        <Td color={appsChangePositive ? "green.400" : "red.400"}>
                          {comp.appsChange}%
                        </Td>
                        <Td color={siteChangePositive ? "green.400" : "red.400"}>
                          {comp.siteChange}%
                        </Td>
                        <Td color={ctvChangePositive ? "green.400" : "red.400"}>
                          {comp.ctvChange}%
                        </Td>
                        <Td color={subtotalChangePositive ? "green.400" : "red.400"}>
                          {comp.subtotalChange}%
                        </Td>
                        <Td color={totalChangePositive ? "green.400" : "red.400"}>
                          {comp.totalChange}%
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      )}

      {/* Visualization Panels */}
      {!isLoading && !error && (
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={6}>
          {/* Main Pie Chart Box (Distribution Section) */}
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)"
            borderRadius="20px"
            p={6}
            border="5px solid rgba(255, 255, 255, 0.8)"
            boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
          >
            <Text fontSize="lg" mb={4} textAlign="center" color="white" fontWeight="bold">
              Distribution of APPS', SITE, & CTV
            </Text>
            <Flex justifyContent="center" mb={4}>
              {totalApps === 0 && totalSites === 0 && totalCtv === 0 ? (
                <Text fontSize="sm" color="white">No data to display.</Text>
              ) : (
                <Plot
                  data={pieData}
                  layout={{
                    width: 500, // Increased size
                    height: 500, // Increased size
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    showlegend: true,
                    legend: { orientation: "h", x: 0.3, y: -0.2 },
                  }}
                  config={{ displayModeBar: false }}
                />
              )}
            </Flex>
            {/* Filters for Distribution Section */}
            <Flex direction="column" gap={2}>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                placeholder="Select Category"
                bg="white"
                color="black"
                size="sm"
              >
                <option value="All">All</option>
                <option value="LigaMX">LigaMX</option>
                <option value="Politics">Politics</option>
                <option value="Other">Other</option>
              </Select>
              {/* Removed Time Frame Select */}
              {/*
              <Select
                value={selectedTimeFrame}
                onChange={(e) => setSelectedTimeFrame(e.target.value)}
                placeholder="Select Time Frame"
                bg="white"
                color="black"
                size="sm"
              >
                <option value="All Time">All Time</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Historic">Historic</option>
              </Select>
              */}
            </Flex>
          </Box>

          {/* Averages Box (Distribution Section) */}
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)"
            borderRadius="20px"
            p={4} // Reduced padding from 6 to 4
            border="5px solid rgba(255, 255, 255, 0.8)"
            boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
          >
            <Text fontSize="md" mb={4} textAlign="center" color="white" fontWeight="bold">
              Average Number of APPS', SITE, & CTV Clicks
            </Text>
            <Flex direction="column" gap={4} align="center">
              {/* Average APPS' */}
              <Box
                bg="gray.600"
                p={4} // Reduced padding from 8 to 4
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid rgba(255, 255, 255, 0.5)"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  Average APPS'
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white"> {/* Reduced fontSize from 3xl to xl */}
                  {averageApps}
                </Text>
              </Box>
              {/* Average SITE */}
              <Box
                bg="gray.600"
                p={4} // Reduced padding from 8 to 4
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid rgba(255, 255, 255, 0.5)"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  Average SITE
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white"> {/* Reduced fontSize from 3xl to xl */}
                  {averageSites}
                </Text>
              </Box>
              {/* Average CTV */}
              <Box
                bg="gray.600"
                p={4} // Reduced padding from 8 to 4
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid rgba(255, 255, 255, 0.5)"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  Average CTV
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white"> {/* Reduced fontSize from 3xl to xl */}
                  {averageCtv}
                </Text>
              </Box>
              {/* Average SUBTOTAL */}
              <Box
                bg="gray.600"
                p={4} // Reduced padding from 8 to 4
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid rgba(255, 255, 255, 0.5)"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  Average SUBTOTAL
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white"> {/* Reduced fontSize from 3xl to xl */}
                  {averageSubtotal}
                </Text>
              </Box>
              {/* Average TOTAL */}
              <Box
                bg="gray.600"
                p={4} // Reduced padding from 8 to 4
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid rgba(255, 255, 255, 0.5)"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  Average TOTAL
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white"> {/* Reduced fontSize from 3xl to xl */}
                  {averageTotal}
                </Text>
              </Box>
            </Flex>
          </Box>
        </Grid>
      )}

      {/* Interactive Line Graph */}
      {!isLoading && !error && (
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)"
          borderRadius="20px"
          p={6}
          border="5px solid rgba(255, 255, 255, 0.8)"
          boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
          mb={6}
        >
          <Text fontSize="lg" mb={4} textAlign="center" color="white" fontWeight="bold">
            APPS', SITE, CTV Clicks Over Time
          </Text>
          <Flex direction={{ base: "column", md: "row" }} justifyContent="space-between" mb={4} gap={4}>
            <Select
              placeholder="Select Graph Option"
              value={selectedGraphOption}
              onChange={(e) => setSelectedGraphOption(e.target.value)}
              bg="white"
              color="black"
              size="sm"
              width={{ base: "100%", md: "200px" }}
            >
              <option value="APPS">APPS'</option>
              <option value="SITE">SITE</option>
              <option value="CTV">CTV</option>
              <option value="SUBTOTAL">SUBTOTAL (APPS + SITE)</option>
              <option value="TOTAL">TOTAL (SUBTOTAL + CTV)</option>
            </Select>

            {/* Customizable Event Selection Dropdown */}
            <Box width={{ base: "100%", md: "300px" }}>
              <Select
                placeholder="Select Event"
                onChange={handleEventSelection}
                bg="gray.600" // Dark grey background
                color="white" // White text
                size="sm"
                value=""
              >
                {lineGraphData.events
                  .filter((event) => !selectedEvents.includes(event.id))
                  .map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.eventName} - {event.eventDate}
                    </option>
                  ))}
              </Select>
              {/* Display selected events as tags */}
              <Flex mt={2} wrap="wrap" gap={2}>
                {selectedEvents.map((eventId) => {
                  const event = lineGraphData.events.find((e) => e.id === eventId);
                  return (
                    <Tag
                      size="sm"
                      key={eventId}
                      borderRadius="full"
                      variant="solid"
                      colorScheme="teal"
                    >
                      <TagLabel>{event ? `${event.eventName} - ${event.eventDate}` : "Unknown Event"}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveSelectedEvent(eventId)} />
                    </Tag>
                  );
                })}
              </Flex>
            </Box>
          </Flex>
          <Flex justifyContent="center">
            {lineGraphData.months.length === 0 ? (
              <Text fontSize="sm" color="white">No data to display.</Text>
            ) : (
              <Plot
                data={[
                  {
                    x: filteredLineGraphData.x,
                    y: filteredLineGraphData.y,
                    type: "scatter",
                    mode: "lines+markers",
                    name: filteredLineGraphData.name,
                    line: { color: filteredLineGraphData.color },
                    fill: 'tozeroy', // Filled area below the line
                    fillcolor: `${filteredLineGraphData.color}33`, // 20% opacity
                    marker: {
                      color: "white",
                      size: 6,
                    },
                    text: filteredLineGraphData.y.map((y) => formatNumber(y)),
                    textposition: "top center",
                    textfont: {
                      color: "white",
                      size: 12,
                      family: "Arial",
                      weight: "bold",
                    },
                  },
                ]}
                layout={{
                  width: "100%",
                  height: 500, // Increased height for better visibility
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  xaxis: {
                    title: "Event Date",
                    type: "category",
                    tickangle: -45,
                    automargin: true,
                    tickfont: {
                      color: "white",
                      size: 12,
                    },
                    titlefont: {
                      color: "white",
                      size: 14,
                      family: "Arial",
                      weight: "bold",
                    },
                  },
                  yaxis: {
                    title: "Count",
                    tickfont: {
                      color: "white",
                      size: 12,
                    },
                    titlefont: {
                      color: "white",
                      size: 14,
                      family: "Arial",
                      weight: "bold",
                    },
                  },
                  legend: {
                    orientation: "h",
                    x: 0.5,
                    y: -0.2,
                    xanchor: "center",
                    yanchor: "top",
                    font: {
                      color: "white",
                      size: 12,
                      family: "Arial",
                      weight: "bold",
                    },
                  },
                  hoverlabel: {
                    bgcolor: "gray", // Changed tooltip background to grey
                    font: {
                      color: "white",
                      family: "Arial",
                      size: 12,
                      weight: "bold",
                    },
                  },
                }}
                config={{ displayModeBar: false }}
              />
            )}
          </Flex>
        </Box>
      )}

      {/* Comparison Section */}
      {/* Removed as comparison is now handled above the pie chart */}

      {/* Show Database Button at the Bottom */}
      {/* Removed as per your instruction to delete the database management */}
    </Box>
  );
};

export default NewPage;
