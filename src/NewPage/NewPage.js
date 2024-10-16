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
} from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import Papa from "papaparse";
import Plot from "react-plotly.js";

// Helper function to parse date strings like "12-Jan" to Date objects
const parseDateString = (dateStr) => {
  const regex = /^(\d{1,2})-([A-Za-z]{3})$/;
  const match = dateStr.match(regex);
  if (!match) return null;
  const [, day, monthAbbr] = match;
  const month = new Date(`${monthAbbr} 1, 2000`).getMonth(); // Convert month abbreviation to month index
  if (isNaN(month)) return null;
  const year = new Date().getFullYear(); // Assuming current year
  return new Date(year, month, parseInt(day, 10));
};

// Helper function to format dates as "M/D/YYYY"
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date)) return "Invalid Date";
  const month = date.getMonth() + 1; // Months are zero-based
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Helper function to format numbers with commas and no decimals
const formatNumber = (number) => {
  if (number === null || number === undefined) return "-";
  if (isNaN(number)) return "-";
  return Number(number).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const NewPage = () => {
  const [eventData, setEventData] = useState([]); // Aggregated event data
  const [categories, setCategories] = useState([]); // Unique categories
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("All"); // For Distribution Section
  const [selectedSubcategory, setSelectedSubcategory] = useState("All"); // New Subcategory Filter
  const [selectedGraphOption, setSelectedGraphOption] = useState("TOTAL"); // Graph metric

  const [selectedEvents, setSelectedEvents] = useState([]); // For customizable line graph
  const [selectedRow, setSelectedRow] = useState(null); // For detailed event view

  const [isTableExpanded, setIsTableExpanded] = useState(false); // Toggle table expansion
  const [isPieChartVisible, setIsPieChartVisible] = useState(false); // Toggle pie chart visibility

  const [tableCategoryFilter, setTableCategoryFilter] = useState("All"); // Table-specific category filter
  const [tableSubcategoryFilter, setTableSubcategoryFilter] = useState("All"); // New Table Subcategory Filter
  const [compareMode, setCompareMode] = useState(false); // Toggle compare mode
  const [selectedCompareEvents, setSelectedCompareEvents] = useState([]); // Events selected for comparison

  const [timelineRange, setTimelineRange] = useState({ start: null, end: null }); // Timeline range for line graph

  const [metricsType, setMetricsType] = useState("Average"); // New state for metrics type

  const toast = useToast();

  // New Google Sheets CSV URL
  const PRIMARY_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRA4x6epe-dPmk8C0RxA9Y9bgj4t7GUglqLzSn1FmPGawDdD5yawZg-ZO3hSG01yA/pub?output=csv";

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

  // Fetch primary CSV and process event data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch primary CSV
        const primaryData = await fetchCSVData(PRIMARY_CSV_URL);
        // Data starts from row 10 (index 9)
        const dataRows = primaryData.slice(9);

        const allEventData = [];

        dataRows.forEach((row, index) => {
          try {
            const weekNumberStr = row[2]?.trim(); // Column C (index 2)
            const weekNumber = weekNumberStr ? parseInt(weekNumberStr, 10) : 0;
            const category = row[3]?.trim(); // Column D (index 3)
            const subcategory = row[4]?.trim(); // Column E (index 4)
            const dateStr = row[5]?.trim(); // Column F (index 5)
            const eventName = row[6]?.trim(); // Column G (index 6)
            const eventDescription = row[7]?.trim(); // Column H (index 7)
            const siteUsers = row[12]?.trim(); // Column M (index 12)
            const appsUsers = row[13]?.trim(); // Column N (index 13)
            const subtotal = row[14]?.trim(); // Column O (index 14)
            const ctv = row[15]?.trim(); // Column P (index 15)
            const total = row[16]?.trim(); // Column Q (index 16)
            const aprov = row[18]?.trim(); // Column S (index 18)

            // Skip row if category is empty
            if (!category) {
              return;
            }

            // Parse date
            const eventDate = parseDateString(dateStr);
            if (!eventDate) {
              console.warn(`Invalid date format in row ${index + 10}: "${dateStr}"`);
            }

            // Parse numerical values, handling possible errors
            const parsedSiteUsers = parseFloat(siteUsers.replace(/,/g, "")) || 0;
            const parsedAppsUsers = parseFloat(appsUsers.replace(/,/g, "")) || 0;
            const parsedSubtotal =
              parseFloat(subtotal.replace(/,/g, "")) ||
              parsedAppsUsers + parsedSiteUsers;
            const parsedCtv = ctv && ctv !== "-" ? parseFloat(ctv.replace(/,/g, "")) : 0;
            const parsedTotal = total && total !== "-"
              ? parseFloat(total.replace(/,/g, ""))
              : parsedSubtotal + parsedCtv;

            // Parse aprov, keep as number or null for '-'
            const parsedAprov = aprov && aprov !== "-" ? parseFloat(aprov.replace(/,/g, "")) : null;

            allEventData.push({
              id: `${eventName}-${dateStr}-${category}-${subcategory}-${index}`, // Unique identifier
              weekNumber: weekNumber || 0,
              category: category,
              subcategory: subcategory || "N/A",
              eventDate: eventDate ? eventDate.toISOString().split("T")[0] : "N/A", // Format as YYYY-MM-DD
              eventName: eventName || "N/A",
              eventDescription: eventDescription || "",
              siteUsers: parsedSiteUsers,
              appsUsers: parsedAppsUsers,
              subtotal: parsedSubtotal,
              ctv: parsedCtv,
              total: parsedTotal,
              aprov: parsedAprov, // Store as number or null
            });
          } catch (err) {
            console.error(`Error processing row ${index + 10}:`, err);
            // Continue processing other rows
          }
        });

        // Sort allEventData based on weekNumber descending, then eventDate descending
        allEventData.sort((a, b) => {
          if (b.weekNumber !== a.weekNumber) {
            return b.weekNumber - a.weekNumber;
          }
          return new Date(b.eventDate) - new Date(a.eventDate);
        });
        setEventData(allEventData);

        // Extract unique categories and subcategories
        const uniqueCategories = Array.from(new Set(allEventData.map((d) => d.category))).sort();
        setCategories(uniqueCategories);
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

  // Extract unique subcategories based on selected category
  const subcategories = useMemo(() => {
    if (selectedCategory === "All") {
      return Array.from(new Set(eventData.map((d) => d.subcategory))).sort();
    }
    const filtered = eventData.filter((d) => d.category === selectedCategory);
    return Array.from(new Set(filtered.map((d) => d.subcategory))).sort();
  }, [eventData, selectedCategory]);

  // Dynamic Category Colors Assignment
  const categoryColors = useMemo(() => {
    const predefinedColors = [
      "blue.600",
      "green.600",
      "purple.600",
      "orange.600",
      "teal.600",
      "red.600",
      "yellow.600",
      "pink.600",
      "cyan.600",
      "gray.600",
      "indigo.600",
      "purple.500",
      "blue.500",
      "green.500",
      "orange.500",
      "teal.500",
      "red.500",
      "yellow.500",
      "pink.500",
      "cyan.500",
      // Add more colors as needed
    ];

    const mapping = {};
    categories.forEach((category, index) => {
      mapping[category] = predefinedColors[index % predefinedColors.length];
    });
    return mapping;
  }, [categories]);

  // Filtering data for Distribution Section based on selectedCategory and selectedSubcategory
  const distributionFilteredData = useMemo(() => {
    let data = [...eventData];
    if (selectedCategory !== "All") {
      data = data.filter((d) => d.category === selectedCategory);
    }
    if (selectedSubcategory !== "All") {
      data = data.filter((d) => d.subcategory === selectedSubcategory);
    }

    // Filter by timeline range if set
    if (timelineRange.start) {
      data = data.filter((d) => new Date(d.eventDate) >= new Date(timelineRange.start));
    }
    if (timelineRange.end) {
      data = data.filter((d) => new Date(d.eventDate) <= new Date(timelineRange.end));
    }

    return data;
  }, [eventData, selectedCategory, selectedSubcategory, timelineRange]);

  // Filtering data for Events Table based on tableCategoryFilter and tableSubcategoryFilter
  const tableFilteredData = useMemo(() => {
    let data = [...eventData];
    if (tableCategoryFilter !== "All") {
      data = data.filter((d) => d.category === tableCategoryFilter);
    }
    if (tableSubcategoryFilter !== "All") {
      data = data.filter((d) => d.subcategory === tableSubcategoryFilter);
    }

    // Filter by timeline range if set
    if (timelineRange.start) {
      data = data.filter((d) => new Date(d.eventDate) >= new Date(timelineRange.start));
    }
    if (timelineRange.end) {
      data = data.filter((d) => new Date(d.eventDate) <= new Date(timelineRange.end));
    }

    return data;
  }, [eventData, tableCategoryFilter, tableSubcategoryFilter, timelineRange]);

  // Aggregated statistics for Distribution Section
  const totalApps = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.appsUsers, 0);
  }, [distributionFilteredData]);

  const totalSites = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.siteUsers, 0);
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

  // Calculate AVERAGE APROV, ignoring zeros and nulls
  const averageAprov = useMemo(() => {
    const aprovValues = distributionFilteredData
      .map((d) => d.aprov)
      .filter((val) => val !== null && val !== 0);
    if (aprovValues.length === 0) return "0";
    const sumAprov = aprovValues.reduce((sum, val) => sum + val, 0);
    return formatNumber(sumAprov / aprovValues.length);
  }, [distributionFilteredData]);

  // Calculate SUBTOTAL and TOTAL averages for Distribution Section
  const averageSubtotal = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(
      distributionFilteredData.reduce((sum, d) => sum + d.subtotal, 0) /
        distributionFilteredData.length
    );
  }, [distributionFilteredData]);

  const averageTotal = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(
      distributionFilteredData.reduce((sum, d) => sum + d.total, 0) /
        distributionFilteredData.length
    );
  }, [distributionFilteredData]);

  // Calculate AVERAGE CTV excluding 0
  const averageCtv = useMemo(() => {
    const ctvValues = distributionFilteredData
      .map((d) => d.ctv)
      .filter((ctv) => ctv > 0);
    if (ctvValues.length === 0) return "0";
    const sumCtv = ctvValues.reduce((sum, ctv) => sum + ctv, 0);
    return formatNumber(sumCtv / ctvValues.length);
  }, [distributionFilteredData]);

  // Calculate TOTAL Aprov
  const totalAprov = useMemo(() => {
    const aprovValues = distributionFilteredData
      .map((d) => d.aprov)
      .filter((val) => val !== null);
    if (aprovValues.length === 0) return "0";
    const sumAprov = aprovValues.reduce((sum, val) => sum + val, 0);
    return formatNumber(sumAprov);
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

  // Prepare data for Line Graph (Events Over Time)
  const lineGraphData = useMemo(() => {
    // Each event is a point on the graph, connected in the order they appear
    const eventsSorted = [...eventData].sort(
      (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
    );

    const dates = eventsSorted.map((d) => d.eventDate);
    const APPS = eventsSorted.map((d) => d.appsUsers);
    const SITE = eventsSorted.map((d) => d.siteUsers);
    const CTV = eventsSorted.map((d) => d.ctv);
    const SUBTOTAL = eventsSorted.map((d) => d.subtotal);
    const TOTAL = eventsSorted.map((d) => d.total);

    return {
      dates,
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
    } else if (selectedGraphOption === "ALL") {
      return {
        y: null, // Not used in 'ALL' case
        name: "ALL",
        color: null,
      };
    } else {
      return {
        y: lineGraphData.TOTAL,
        name: "TOTAL (SUBTOTAL + CTV)",
        color: "#9966FF",
      };
    }
  }, [lineGraphData, selectedGraphOption]);

  // Determine the 10 most recent events
  const recentEvents = useMemo(() => {
    return tableFilteredData.slice(0, 10);
  }, [tableFilteredData]);

  // Filter the table data based on whether the table is expanded
  const displayedTableData = useMemo(() => {
    if (isTableExpanded) {
      return tableFilteredData;
    } else {
      return recentEvents;
    }
  }, [isTableExpanded, tableFilteredData, recentEvents]);

  // Prepare filtered line graph data based on selected events and timeline range
  const plotData = useMemo(() => {
    if (selectedGraphOption === "ALL") {
      const traceAPPS = {
        x: lineGraphData.dates,
        y: lineGraphData.APPS,
        type: "scatter",
        mode: "lines+markers",
        name: "APPS'",
        line: { color: "#36a2eb" },
        fill: 'tozeroy',
        fillcolor: "#36a2eb33",
        marker: {
          color: "white",
          size: 6,
        },
        // Removed 'text' to prevent interference
        hovertext: lineGraphData.events.map(
          (event) => `${event.eventDescription} ${formatDate(event.eventDate)} ${formatNumber(event.appsUsers)}`
        ),
        hoverinfo: "text",
        hovertemplate: "%{hovertext}<extra></extra>",
      };

      const traceSITE = {
        x: lineGraphData.dates,
        y: lineGraphData.SITE,
        type: "scatter",
        mode: "lines+markers",
        name: "SITE",
        line: { color: "#ff6384" },
        fill: 'tozeroy',
        fillcolor: "#ff638433",
        marker: {
          color: "white",
          size: 6,
        },
        // Removed 'text' to prevent interference
        hovertext: lineGraphData.events.map(
          (event) => `${event.eventDescription} ${formatDate(event.eventDate)} ${formatNumber(event.siteUsers)}`
        ),
        hoverinfo: "text",
        hovertemplate: "%{hovertext}<extra></extra>",
      };

      const traceCTV = {
        x: lineGraphData.dates,
        y: lineGraphData.Ctv,
        type: "scatter",
        mode: "lines+markers",
        name: "CTV",
        line: { color: "#ffce56" },
        fill: 'tozeroy',
        fillcolor: "#ffce5633",
        marker: {
          color: "white",
          size: 6,
        },
        // Removed 'text' to prevent interference
        hovertext: lineGraphData.events.map(
          (event) => `${event.eventDescription} ${formatDate(event.eventDate)} ${event.ctv > 0 ? formatNumber(event.ctv) : "-"}`
        ),
        hoverinfo: "text",
        hovertemplate: "%{hovertext}<extra></extra>",
      };

      return [traceAPPS, traceSITE, traceCTV];
    }

    const aggregateTrace = {
      x: lineGraphData.dates,
      y: lineGraphDisplayData.y,
      type: "scatter",
      mode: "lines+markers",
      name: lineGraphDisplayData.name,
      line: { color: lineGraphDisplayData.color },
      fill: 'tozeroy',
      fillcolor: `${lineGraphDisplayData.color}33`,
      marker: {
        color: "white",
        size: 6,
      },
      // Removed 'text' to prevent interference
      hovertext: lineGraphData.events.map(
        (event) => `${event.eventDescription} ${formatDate(event.eventDate)} ${formatNumber(
          lineGraphDisplayData.y[lineGraphData.events.indexOf(event)]
        )}`
      ),
      hoverinfo: "text",
      hovertemplate: "%{hovertext}<extra></extra>",
    };

    if (selectedEvents.length === 0) {
      return [aggregateTrace];
    }

    // Get selected events in the order they were selected
    const selectedEventData = selectedEvents
      .map((eventId) => eventData.find((e) => e.id === eventId))
      .filter(Boolean)
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    const selectedTrace = {
      x: selectedEventData.map((e) => e.eventDate),
      y: selectedEventData.map((e) => {
        if (selectedGraphOption === "APPS") return e.appsUsers;
        if (selectedGraphOption === "SITE") return e.siteUsers;
        if (selectedGraphOption === "CTV") return e.ctv;
        if (selectedGraphOption === "SUBTOTAL") return e.subtotal;
        return e.total;
      }),
      type: "scatter",
      mode: "lines+markers",
      name: "Selected Events",
      line: { color: "#ff6347" }, // Example color for selected events
      fill: 'tozeroy',
      fillcolor: "#ff634733",
      marker: {
        color: "white",
        size: 8,
      },
      // Removed 'text' to prevent interference
      hovertext: selectedEventData.map(
        (event) => `${event.eventDescription} ${formatDate(event.eventDate)} ${formatNumber(
          selectedGraphOption === "APPS"
            ? event.appsUsers
            : selectedGraphOption === "SITE"
            ? event.siteUsers
            : selectedGraphOption === "CTV"
            ? event.ctv
            : selectedGraphOption === "SUBTOTAL"
            ? event.subtotal
            : event.total
        )}`
      ),
      hoverinfo: "text",
      hovertemplate: "%{hovertext}<extra></extra>",
    };

    return [selectedTrace];
    // If you want to show both, you can uncomment the line below
    // return [aggregateTrace, selectedTrace];
  }, [selectedEvents, lineGraphDisplayData, lineGraphData.dates, selectedGraphOption, eventData]);

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
        baseEvent.appsUsers === 0
          ? 0
          : ((event.appsUsers - baseEvent.appsUsers) / baseEvent.appsUsers) * 100;
      const siteChange =
        baseEvent.siteUsers === 0
          ? 0
          : ((event.siteUsers - baseEvent.siteUsers) / baseEvent.siteUsers) * 100;
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
        ctvChange: ctvChange.toFixed(0),
        subtotalChange: subtotalChange.toFixed(0),
        totalChange: totalChange.toFixed(0),
        eventId: event.id,
      };
    });

    return {
      baseEvent,
      comparisons,
    };
  }, [selectedCompareEvents, eventData]);

  return (
    <Box p={5} color="white" minH="100vh">
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
          <Flex
            justifyContent="space-between"
            alignItems="center"
            mb={4}
            flexWrap="wrap"
            gap={2}
          >
            <Text fontSize="lg" fontWeight="bold" color="white">
              Events Table
            </Text>
            <Flex gap={2} flexWrap="wrap">
              <Select
                placeholder="Filter Category"
                value={tableCategoryFilter}
                onChange={(e) => {
                  setTableCategoryFilter(e.target.value);
                  setTableSubcategoryFilter("All"); // Reset subcategory filter
                }}
                bg="white"
                color="black"
                size="sm"
                width="200px"
              >
                <option value="All">All</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
              <Select
                placeholder="Filter Subcategory"
                value={tableSubcategoryFilter}
                onChange={(e) => setTableSubcategoryFilter(e.target.value)}
                bg="white"
                color="black"
                size="sm"
                width="200px"
                isDisabled={tableCategoryFilter === "All"}
              >
                <option value="All">All</option>
                {tableCategoryFilter !== "All" &&
                  Array.from(
                    new Set(
                      eventData
                        .filter((d) => d.category === tableCategoryFilter)
                        .map((d) => d.subcategory)
                    )
                  )
                    .sort()
                    .map((subcat) => (
                      <option key={subcat} value={subcat}>
                        {subcat}
                      </option>
                    ))}
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
          {/* Removed Reset Timeline Button from Events Table */}
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th fontSize="sm" color="white" fontWeight="bold">Select</Th>
                <Th fontSize="sm" color="white" fontWeight="bold">Week</Th>
                <Th fontSize="sm" color="white" fontWeight="bold">Date</Th>
                <Th fontSize="sm" color="white" fontWeight="bold">Category</Th>
                <Th fontSize="sm" color="white" fontWeight="bold">Subcategory</Th>
                <Th fontSize="sm" color="white" fontWeight="bold">Event Name</Th>
                <Th fontSize="sm" color="white" fontWeight="bold">Description</Th>
                <Th isNumeric fontSize="sm" color="white" fontWeight="bold">SITE</Th>
                <Th isNumeric fontSize="sm" color="white" fontWeight="bold">APPS'</Th>
                <Th isNumeric fontSize="sm" color="white" fontWeight="bold">SUBTOTAL</Th>
                <Th isNumeric fontSize="sm" color="white" fontWeight="bold">CTV</Th>
                <Th isNumeric fontSize="sm" color="white" fontWeight="bold">TOTAL</Th>
                <Th fontSize="sm" color="white" fontWeight="bold">Aprov.</Th>
              </Tr>
            </Thead>
            <Tbody>
              {displayedTableData.map((row) => (
                <Tr
                  key={row.id}
                  bg={categoryColors[row.category] || "gray.600"}
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
                  <Td>{row.weekNumber}</Td>
                  <Td>{row.eventDate}</Td>
                  <Td>{row.category}</Td>
                  <Td>{row.subcategory}</Td>
                  <Td>{row.eventName}</Td>
                  <Td>{row.eventDescription}</Td>
                  <Td isNumeric>{formatNumber(row.siteUsers)}</Td>
                  <Td isNumeric>{formatNumber(row.appsUsers)}</Td>
                  <Td isNumeric>{formatNumber(row.subtotal)}</Td>
                  <Td isNumeric>
                    {row.ctv > 0 ? formatNumber(row.ctv) : "-"}
                  </Td>
                  <Td isNumeric fontWeight="bold">{formatNumber(row.total)}</Td> {/* Made TOTAL numbers bold */}
                  <Td>{row.aprov !== null ? formatNumber(row.aprov) : "-"}</Td>
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
                leftIcon={
                  isTableExpanded ? (
                    <ChevronUpIcon />
                  ) : (
                    <ChevronDownIcon />
                  )
                }
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
                  Distribution for {selectedRow.eventName} on {formatDate(selectedRow.eventDate)}
                </Text>
                <Flex justifyContent="center">
                  <Plot
                    data={[
                      {
                        values: [selectedRow.appsUsers, selectedRow.siteUsers, selectedRow.ctv],
                        labels: ["APPS'", "SITE", "CTV"],
                        type: "pie",
                        marker: {
                          colors: ["#36a2eb", "#ff6384", "#ffce56"],
                        },
                        hoverinfo: "label+percent+value",
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
                      width: 600,
                      height: 600,
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
              <Flex justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
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
                    <Th fontSize="sm" color="white" fontWeight="bold">Event Name</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">APPS' Count</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">SITE Count</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">CTV Count</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">SUBTOTAL Count</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">TOTAL Count</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">APPS' Change (%)</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">SITE Change (%)</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">CTV Change (%)</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">SUBTOTAL Change (%)</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">TOTAL Change (%)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td fontWeight="bold" color="white">
                      {comparisonData.baseEvent.eventName} - {formatDate(comparisonData.baseEvent.eventDate)}
                    </Td>
                    <Td isNumeric>{formatNumber(comparisonData.baseEvent.appsUsers)}</Td>
                    <Td isNumeric>{formatNumber(comparisonData.baseEvent.siteUsers)}</Td>
                    <Td isNumeric>{comparisonData.baseEvent.ctv > 0 ? formatNumber(comparisonData.baseEvent.ctv) : "-"}</Td>
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
                    const event = eventData.find(e => e.id === comp.eventId);

                    return (
                      <Tr key={index}>
                        <Td fontWeight="bold" color="white">
                          {event ? `${event.eventName} - ${formatDate(event.eventDate)}` : `${comp.eventName} - ${formatDate(comp.eventDate)}`}
                        </Td>
                        <Td isNumeric>{event ? formatNumber(event.appsUsers) : "0"}</Td>
                        <Td isNumeric>{event ? formatNumber(event.siteUsers) : "0"}</Td>
                        <Td isNumeric>{event && event.ctv > 0 ? formatNumber(event.ctv) : "-"}</Td>
                        <Td isNumeric>{event ? formatNumber(event.subtotal) : "0"}</Td>
                        <Td isNumeric>{event ? formatNumber(event.total) : "0"}</Td>
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
                    width: 500,
                    height: 500,
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
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory("All"); // Reset subcategory filter
                }}
                placeholder="Select Category"
                bg="white"
                color="black"
                size="sm"
              >
                <option value="All">All</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
              <Select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                placeholder="Select Subcategory"
                bg="white"
                color="black"
                size="sm"
                isDisabled={selectedCategory === "All"}
              >
                <option value="All">All</option>
                {selectedCategory !== "All" &&
                  subcategories.map((subcat) => (
                    <option key={subcat} value={subcat}>
                      {subcat}
                    </option>
                  ))}
              </Select>
              {/* Removed Reset Timeline Button from Distribution Section */}
            </Flex>
          </Box>

          {/* Metrics Box (Average/Total Metrics) */}
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)"
            borderRadius="20px"
            p={6}
            border="5px solid rgba(255, 255, 255, 0.8)"
            boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
          >
            <Flex justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
              <Text fontSize="lg" fontWeight="bold" color="white">
                {metricsType} Metrics
              </Text>
              <Select
                value={metricsType}
                onChange={(e) => setMetricsType(e.target.value)}
                bg="white"
                color="black"
                size="sm"
                width="150px"
              >
                <option value="Average">Average</option>
                <option value="Total">Total</option>
              </Select>
            </Flex>
            <Flex direction="column" gap={4} align="center">
              {/* APPS' */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {metricsType} APPS'
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {metricsType === "Average" ? averageApps : formatNumber(totalApps)}
                </Text>
              </Box>
              {/* SITE */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {metricsType} SITE
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {metricsType === "Average" ? averageSites : formatNumber(totalSites)}
                </Text>
              </Box>
              {/* SUBTOTAL */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {metricsType} SUBTOTAL
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {metricsType === "Average" ? averageSubtotal : formatNumber(totalSubtotal)}
                </Text>
              </Box>
              {/* CTV */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {metricsType} CTV
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {metricsType === "Average" ? averageCtv : formatNumber(totalCtv)}
                </Text>
              </Box>
              {/* TOTAL */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {metricsType} TOTAL
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {metricsType === "Average" ? averageTotal : formatNumber(totalTotal)}
                </Text>
              </Box>
              {/* Aprov */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
              >
                <Text fontSize="sm" fontWeight="semibold" color="white">
                  {metricsType} Aprov
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="white">
                  {metricsType === "Average" ? averageAprov : totalAprov}
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
              <option value="ALL">All</option>
            </Select>

            {/* Customizable Event Selection Dropdown */}
            <Box width={{ base: "100%", md: "300px" }}>
              <Select
                placeholder="Select Events"
                onChange={handleEventSelection}
                bg="gray.600"
                color="white"
                size="sm"
                value=""
              >
                {lineGraphData.events
                  .filter((event) => !selectedEvents.includes(event.id))
                  .map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.eventDescription || "No Description"}
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
                      <TagLabel>{event ? `${event.eventDescription || "No Description"}` : "Unknown Event"}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveSelectedEvent(eventId)} />
                    </Tag>
                  );
                })}
              </Flex>
            </Box>
          </Flex>
          <Flex justifyContent="center">
            {lineGraphData.dates.length === 0 ? (
              <Text fontSize="sm" color="white">No data to display.</Text>
            ) : (
              <Plot
                data={plotData}
                layout={{
                  width: "100%",
                  height: 500,
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                  xaxis: {
                    title: "Event Date",
                    type: "date",
                    rangeselector: {
                      buttons: [
                        {
                          count: 1,
                          label: "1m",
                          step: "month",
                          stepmode: "backward",
                        },
                        {
                          count: 6,
                          label: "6m",
                          step: "month",
                          stepmode: "backward",
                        },
                        { step: "all" },
                      ],
                    },
                    rangeslider: { visible: true },
                    tickangle: -45,
                    automargin: true,
                    tickfont: {
                      color: "rgba(255, 255, 255, 0.7)", // Semi-transparent white
                      size: 12,
                    },
                    titlefont: {
                      color: "white",
                      size: 14,
                      family: "Arial",
                      weight: "bold",
                    },
                    gridcolor: "rgba(255, 255, 255, 0.2)", // More transparent grid lines
                  },
                  yaxis: {
                    title: "Count",
                    tickfont: {
                      color: "rgba(255, 255, 255, 0.7)", // Semi-transparent white
                      size: 12,
                    },
                    titlefont: {
                      color: "white",
                      size: 14,
                      family: "Arial",
                      weight: "bold",
                    },
                    gridcolor: "rgba(255, 255, 255, 0.2)", // More transparent grid lines
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
                    bgcolor: "gray",
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

      {/* Note: The Comparison and Database Management sections remain unchanged */}
    </Box>
  );
};

export default NewPage;
