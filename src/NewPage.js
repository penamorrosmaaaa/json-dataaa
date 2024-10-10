/* src/NewPage/NewPage.js */

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Button,
  Select,
  Grid,
  Input,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import Papa from "papaparse";
import Plot from "react-plotly.js";

// Helper function to fetch and process CSV data
const fetchCSVData = async (csvUrl) => {
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    const csvText = await response.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      console.error("CSV Parsing Errors:", parsed.errors);
      throw new Error("Error parsing CSV data.");
    }
    return parsed.data;
  } catch (error) {
    console.error("Error fetching CSV:", error);
    throw error;
  }
};

const NewPage = () => {
  const [csvLinks, setCsvLinks] = useState([]); // { url: '', category: '' }
  const [csvData, setCsvData] = useState([]); // Aggregated data from all CSVs
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("All Time");
  const [selectedComparison, setSelectedComparison] = useState("");

  const [selectedRow, setSelectedRow] = useState(null); // For detailed event view
  const [eventDetails, setEventDetails] = useState({}); // { [eventId]: details }

  const toast = useToast();

  // Fetch and aggregate data whenever csvLinks change
  useEffect(() => {
    const fetchData = async () => {
      if (csvLinks.length === 0) {
        setCsvData([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const allData = [];
        for (const link of csvLinks) {
          const data = await fetchCSVData(link.url);
          // Extract "Resumen" sheet data
          const resumenData = data; // Assuming the CSV is only the "Resumen" sheet
          if (resumenData.length < 10) {
            console.warn(`CSV at ${link.url} does not have enough rows.`);
            continue;
          }

          // Sum B5:B9 (Apps) - assuming columns are labeled accordingly
          const appsSum = resumenData
            .slice(4, 9) // B5:B9 are rows 5 to 9 (0-indexed)
            .reduce((sum, row) => {
              const value = parseInt(row["B"] || row["Apps"] || 0, 10);
              return !isNaN(value) ? sum + value : sum;
            }, 0);
          // Get B10 (Site)
          const siteCount = parseInt(resumenData[9]["B"] || resumenData[9]["Site"] || 0, 10) || 0;

          // Extract Date and Event Name from A2:E2
          const headerRow = resumenData[1]; // Assuming A2:E2 is the second row
          const title = headerRow["A"] || headerRow["Event"] || "Event Title";
          const [eventName, eventDate] = title.split(" - ");

          allData.push({
            url: link.url,
            category: link.category,
            eventName: eventName ? eventName.trim() : "N/A",
            eventDate: eventDate ? eventDate.trim() : "N/A",
            apps: isNaN(appsSum) ? 0 : appsSum,
            site: isNaN(siteCount) ? 0 : siteCount,
          });
        }
        setCsvData(allData);
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
  }, [csvLinks, toast]);

  // Handler to add a new CSV link
  const handleAddLink = () => {
    setCsvLinks([...csvLinks, { url: "", category: "LigaMX" }]);
  };

  // Handler to update a CSV link
  const handleUpdateLink = (index, field, value) => {
    const updatedLinks = [...csvLinks];
    updatedLinks[index][field] = value;
    setCsvLinks(updatedLinks);
  };

  // Handler to delete a CSV link
  const handleDeleteLink = (index) => {
    const updatedLinks = [...csvLinks];
    updatedLinks.splice(index, 1);
    setCsvLinks(updatedLinks);
  };

  // Handler to save the CSV links (could be enhanced to persist in localStorage or backend)
  const handleSaveLinks = () => {
    // Validate URLs
    for (const link of csvLinks) {
      if (!link.url) {
        toast({
          title: "Validation Error",
          description: "Please provide a valid CSV URL.",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      // Additional URL validation can be added here
    }
    toast({
      title: "Success",
      description: "CSV links updated successfully.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Filtering data based on selected category and time frame
  const filteredData = useMemo(() => {
    let data = [...csvData];
    if (selectedCategory !== "All") {
      data = data.filter((d) => d.category === selectedCategory);
    }
    // Implement time frame filtering if date data is available
    // For simplicity, assuming eventDate is in "DDMMMYYYY" format
    // You may need to adjust the date parsing based on actual format
    if (selectedTimeFrame !== "All Time") {
      const now = new Date();
      let startDate;
      if (selectedTimeFrame === "Monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      } else if (selectedTimeFrame === "Weekly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      } else if (selectedTimeFrame === "Yearly") {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      } else if (selectedTimeFrame === "Historic") {
        startDate = new Date(0); // Epoch
      }
      data = data.filter((d) => {
        const [day, monthStr, year] = d.eventDate.match(/(\d{1,2})(\w{3})(\d{4})/) || [];
        if (!day || !monthStr || !year) return false;
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
        const month = monthMap[monthStr];
        if (month === undefined) return false;
        const date = new Date(year, month, day);
        return date >= startDate;
      });
    }
    return data;
  }, [csvData, selectedCategory, selectedTimeFrame]);

  // Aggregated statistics
  const totalApps = useMemo(() => {
    return filteredData.reduce((sum, d) => sum + d.apps, 0);
  }, [filteredData]);

  const totalSites = useMemo(() => {
    return filteredData.reduce((sum, d) => sum + d.site, 0);
  }, [filteredData]);

  // Prepare data for Pie Chart
  const pieData = useMemo(() => {
    return [
      {
        values: [totalApps, totalSites],
        labels: ["Apps", "Site"],
        type: "pie",
        marker: {
          colors: ["#36a2eb", "#ff6384"],
        },
        hoverinfo: "label+percent",
      },
    ];
  }, [totalApps, totalSites]);

  // Prepare data for Average Displays
  const averageApps = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return (totalApps / filteredData.length).toFixed(2);
  }, [totalApps, filteredData]);

  const averageSites = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return (totalSites / filteredData.length).toFixed(2);
  }, [totalSites, filteredData]);

  // Prepare data for Line Graph
  const lineGraphData = useMemo(() => {
    // Aggregate by date
    const dateMap = {};
    filteredData.forEach((d) => {
      if (!dateMap[d.eventDate]) {
        dateMap[d.eventDate] = { apps: 0, site: 0 };
      }
      dateMap[d.eventDate].apps += d.apps;
      dateMap[d.eventDate].site += d.site;
    });

    const sortedDates = Object.keys(dateMap).sort((a, b) => {
      const parseDate = (dateStr) => {
        const [day, monthStr, year] = dateStr.match(/(\d{1,2})(\w{3})(\d{4})/) || [];
        if (!day || !monthStr || !year) return new Date(0);
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
        const month = monthMap[monthStr];
        if (month === undefined) return new Date(0);
        return new Date(year, month, day);
      };
      return parseDate(a) - parseDate(b);
    });

    const apps = sortedDates.map((date) => dateMap[date].apps);
    const sites = sortedDates.map((date) => dateMap[date].site);

    return {
      dates: sortedDates,
      apps,
      sites,
    };
  }, [filteredData]);

  // Handler for row selection in the table
  const handleRowClick = (row) => {
    setSelectedRow(row);
  };

  // Handler to update event details
  const handleDetailChange = (eventId, value) => {
    setEventDetails({
      ...eventDetails,
      [eventId]: value,
    });
  };

  return (
    <Box p={5} color="white" bg="gray.800" minH="100vh">
      {/* CSV Link Management */}
      <Box bg="gray.700" p={5} borderRadius="md" mb={6}>
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Text fontSize="2xl" fontWeight="bold">
            Manage CSV Links
          </Text>
          <Button leftIcon={<AddIcon />} colorScheme="teal" onClick={handleAddLink}>
            Add Link
          </Button>
        </Flex>
        {csvLinks.length === 0 ? (
          <Text>No CSV links added yet.</Text>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>URL</Th>
                <Th>Category</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {csvLinks.map((link, index) => (
                <Tr key={index}>
                  <Td>
                    <Input
                      placeholder="Enter CSV URL"
                      value={link.url}
                      onChange={(e) => handleUpdateLink(index, "url", e.target.value)}
                      size="sm"
                      bg="white"
                      color="black"
                    />
                  </Td>
                  <Td>
                    <Select
                      value={link.category}
                      onChange={(e) => handleUpdateLink(index, "category", e.target.value)}
                      size="sm"
                      bg="white"
                      color="black"
                    >
                      <option value="LigaMX">LigaMX</option>
                      <option value="Politics">Politics</option>
                      <option value="Other">Other</option>
                    </Select>
                  </Td>
                  <Td>
                    <IconButton
                      icon={<DeleteIcon />}
                      colorScheme="red"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLink(index)}
                      aria-label="Delete Link"
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
        {csvLinks.length > 0 && (
          <Flex justifyContent="flex-end" mt={4}>
            <Button colorScheme="blue" onClick={handleSaveLinks}>
              Save Links
            </Button>
          </Flex>
        )}
      </Box>

      {/* Visualization Panels */}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={6}>
        {/* Pie Chart Box */}
        <Box bg="gray.700" p={5} borderRadius="md" boxShadow="lg">
          <Text fontSize="xl" mb={4} textAlign="center">
            Distribution of Apps vs Site
          </Text>
          <Flex justifyContent="center" mb={4}>
            <Plot
              data={pieData}
              layout={{
                width: 400,
                height: 400,
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                showlegend: true,
                legend: { orientation: "h", x: 0.3, y: -0.2 },
              }}
              config={{ displayModeBar: false }}
            />
          </Flex>
          {/* Filters */}
          <Flex direction="column" gap={4}>
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
              <option value="Weekly">Weekly</option>
              <option value="Yearly">Yearly</option>
              <option value="Historic">Historic</option>
            </Select>
          </Flex>
        </Box>

        {/* Averages Box */}
        <Box bg="gray.700" p={5} borderRadius="md" boxShadow="lg">
          <Text fontSize="xl" mb={4} textAlign="center">
            Average Number of Apps & Site Clicks
          </Text>
          <Grid templateColumns="repeat(2, 1fr)" gap={6}>
            <Box textAlign="center">
              <Text fontSize="lg" fontWeight="semibold">
                Average Apps
              </Text>
              <Text fontSize="2xl">{averageApps}</Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="lg" fontWeight="semibold">
                Average Site Clicks
              </Text>
              <Text fontSize="2xl">{averageSites}</Text>
            </Box>
          </Grid>
        </Box>
      </Grid>

      {/* Interactive Line Graph */}
      <Box bg="gray.700" p={5} borderRadius="md" boxShadow="lg" mb={6}>
        <Text fontSize="xl" mb={4} textAlign="center">
          Apps & Site Clicks Over Time
        </Text>
        <Flex direction={{ base: "column", md: "row" }} justifyContent="space-between" mb={4} gap={4}>
          <Select
            placeholder="Select Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            bg="white"
            color="black"
            size="sm"
            width={{ base: "100%", md: "200px" }}
          >
            <option value="All">All</option>
            <option value="LigaMX">LigaMX</option>
            <option value="Politics">Politics</option>
            <option value="Other">Other</option>
          </Select>
          <Select
            placeholder="Select Time Frame"
            value={selectedTimeFrame}
            onChange={(e) => setSelectedTimeFrame(e.target.value)}
            bg="white"
            color="black"
            size="sm"
            width={{ base: "100%", md: "200px" }}
          >
            <option value="All Time">All Time</option>
            <option value="Monthly">Monthly</option>
            <option value="Weekly">Weekly</option>
            <option value="Yearly">Yearly</option>
            <option value="Historic">Historic</option>
          </Select>
          <Select
            placeholder="Compare With"
            value={selectedComparison}
            onChange={(e) => setSelectedComparison(e.target.value)}
            bg="white"
            color="black"
            size="sm"
            width={{ base: "100%", md: "200px" }}
          >
            <option value="LigaMX">LigaMX</option>
            <option value="Politics">Politics</option>
            <option value="Other">Other</option>
          </Select>
        </Flex>
        <Plot
          data={[
            {
              x: lineGraphData.dates,
              y: lineGraphData.apps,
              type: "scatter",
              mode: "lines+markers",
              name: "Apps",
              line: { color: "#36a2eb" },
            },
            {
              x: lineGraphData.dates,
              y: lineGraphData.sites,
              type: "scatter",
              mode: "lines+markers",
              name: "Site",
              line: { color: "#ff6384" },
            },
          ]}
          layout={{
            width: "100%",
            height: 400,
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            xaxis: {
              title: "Date",
              type: "date",
              tickformat: "%d-%b-%Y",
              tickangle: -45,
              automargin: true,
            },
            yaxis: {
              title: "Count",
            },
            legend: {
              orientation: "h",
              x: 0.5,
              y: -0.2,
              xanchor: "center",
              yanchor: "top",
            },
          }}
          config={{ displayModeBar: false }}
        />
      </Box>

      {/* Interactive Table */}
      <Box bg="gray.700" p={5} borderRadius="md" boxShadow="lg">
        <Text fontSize="xl" mb={4} textAlign="center">
          Events Table
        </Text>
        <Table variant="simple" size="md">
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Event Name</Th>
              <Th>Details</Th>
              <Th isNumeric>Apps</Th>
              <Th isNumeric>Site</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredData.map((row, index) => (
              <Tr
                key={index}
                _hover={{ bg: "gray.600", cursor: "pointer" }}
                onClick={() => handleRowClick(row)}
              >
                <Td>{row.eventDate}</Td>
                <Td>{row.eventName}</Td>
                <Td>
                  <Input
                    placeholder="Enter details"
                    value={eventDetails[index] || ""}
                    onChange={(e) => handleDetailChange(index, e.target.value)}
                    size="sm"
                    bg="white"
                    color="black"
                  />
                </Td>
                <Td isNumeric>{row.apps}</Td>
                <Td isNumeric>{row.site}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        {/* Detailed Pie Chart for Selected Row */}
        {selectedRow && (
          <Box mt={6} bg="gray.600" p={4} borderRadius="md">
            <Text fontSize="lg" mb={4} textAlign="center">
              Distribution for {selectedRow.eventName} on {selectedRow.eventDate}
            </Text>
            <Flex justifyContent="center">
              <Plot
                data={[
                  {
                    values: [selectedRow.apps, selectedRow.site],
                    labels: ["Apps", "Site"],
                    type: "pie",
                    marker: {
                      colors: ["#36a2eb", "#ff6384"],
                    },
                    hoverinfo: "label+percent",
                  },
                ]}
                layout={{
                  width: 300,
                  height: 300,
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                }}
                config={{ displayModeBar: false }}
              />
            </Flex>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NewPage;
