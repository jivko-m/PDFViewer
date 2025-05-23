document.addEventListener("DOMContentLoaded", () => {
  let html2pdfInstance = null; // Store html2pdf instance
  const container = document.querySelector(".pdf-container");
  const content = document.querySelector(".pdf-content");
  const pageNumber = document.querySelector(".page-number");
  const totalPages = document.querySelector(".page-info span");
  const prevButton = document.querySelector(".pdf-controls button:first-child");
  const nextButton = document.querySelector(
    ".pdf-controls .tool-button[title='Next']"
  );
  const zoomSelect = document.querySelector(".zoom-level");
  // Create pages container
  const pagesContainer = document.createElement("div");
  pagesContainer.className = "pdf-pages-container";
  content.appendChild(pagesContainer);

  // Move the existing page into the pages container
  const existingPage = document.querySelector(".pdf-page");
  if (existingPage && existingPage.parentElement !== pagesContainer) {
    existingPage.remove();
    pagesContainer.appendChild(existingPage);
  }
  // Initialize variables
  let currentZoom = 1; // Default zoom to 100%
  let currentPageIndex = 0;
  let currentRegNumber = 1; // Add counter for registration numbers

  // Set initial zoom
  pagesContainer.style.transform = `scale(${currentZoom})`;
  pagesContainer.style.transformOrigin = "top center";
  zoomSelect.value = currentZoom;

  function initializePages() {
    const originalPage = document.querySelector(".pdf-page");
    const table = originalPage.querySelector("table");
    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const thead = table.querySelector("thead").cloneNode(true);

    // Create a full-size temporary container for measurements
    const tempContainer = document.createElement("div");
    tempContainer.style.cssText = `
            position: absolute;
            visibility: hidden;
            width: ${table.offsetWidth}px;
            left: -9999px;
        `;
    document.body.appendChild(tempContainer);

    // Create a test table
    const testTable = document.createElement("table");
    testTable.className = "pdf-table";
    testTable.style.width = "100%";
    testTable.appendChild(thead.cloneNode(true));
    const testTbody = document.createElement("tbody");
    testTable.appendChild(testTbody);
    tempContainer.appendChild(testTable); // Get precise measurements
    const headerHeight = testTable.querySelector("thead").offsetHeight;
    const pageInnerHeight = 1000; // A4 height in px (297mm) at 300 DPI
    const pageVerticalPadding = 20; // 2rem (16px * 2)
    const availableHeight = pageInnerHeight - pageVerticalPadding * 2;

    // Calculate exact row heights
    const rowHeights = [];
    rows.forEach((row) => {
      testTbody.innerHTML = "";
      testTbody.appendChild(row.cloneNode(true));
      rowHeights.push(testTbody.lastChild.offsetHeight);
    });

    // Distribute rows across pages
    let pages = [];
    let remainingRows = [...rows];
    let currentPage = originalPage;

    while (remainingRows.length > 0) {
      let currentHeight = headerHeight;
      let currentRows = [];

      // Fill current page
      while (remainingRows.length > 0) {
        const nextRowHeight = rowHeights[rows.length - remainingRows.length];
        if (currentHeight + nextRowHeight <= availableHeight) {
          currentRows.push(remainingRows.shift());
          currentHeight += nextRowHeight;
        } else {
          break;
        }
      }

      // Create and populate page table
      const pageContent = createPageTable(thead.cloneNode(true), currentRows);
      const tableContainer = currentPage.querySelector(".table-container");
      tableContainer.innerHTML = "";
      tableContainer.appendChild(pageContent);
      pages.push(currentPage);

      // Create new page if there are remaining rows
      if (remainingRows.length > 0) {
        currentPage = createNewPage();
      }
    }

    // Clean up
    tempContainer.remove();

    // Update UI
    updatePageDisplay();
    showCurrentPage();

    // Update total pages count
    totalPages.textContent = pages.length;

    return pages;
  }

  function createPageTable(thead, rows) {
    const table = document.createElement("table");
    table.className = "pdf-table";
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const clonedRow = row.cloneNode(true);
      // Update the registration number (first cell)
      clonedRow.cells[0].textContent = currentRegNumber++;
      tbody.appendChild(clonedRow);
    });
    table.appendChild(tbody);

    return table;
  }
  function createNewPage() {
    const newPage = document.querySelector(".pdf-page").cloneNode(true);
    pagesContainer.appendChild(newPage);
    return newPage;
  }

  function updatePageDisplay() {
    const pages = document.querySelectorAll(".pdf-page");
    pages.forEach((page, index) => {
      page.style.display = index === currentPageIndex ? "block" : "none";
      page.classList.toggle("active", index === currentPageIndex);
    });
  }

  function showCurrentPage() {
    const pages = document.querySelectorAll(".pdf-page");
    pages.forEach((page, index) => {
      page.style.display = index === currentPageIndex ? "block" : "none";
      page.classList.toggle("active", index === currentPageIndex);
    });
  }

  function navigateToPage(pageIdx) {
    const pages = document.querySelectorAll(".pdf-page");
    if (pageIdx >= 0 && pageIdx < pages.length) {
      currentPageIndex = pageIdx;
      showCurrentPage();
      pageNumber.value = pageIdx + 1;
      updateNavigationButtons();
    }
  }

  function updateNavigationButtons() {
    const pages = document.querySelectorAll(".pdf-page");
    prevButton.disabled = currentPageIndex === 0;
    nextButton.disabled = currentPageIndex === pages.length - 1;
  }

  // Handle zoom changes
  zoomSelect.addEventListener("change", (e) => {
    currentZoom = parseFloat(e.target.value);
    pagesContainer.style.transform = `scale(${currentZoom})`;
    pagesContainer.style.transformOrigin = "top center";
  });

  // Handle page number input
  pageNumber.addEventListener("change", (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= parseInt(totalPages.textContent)) {
      navigateToPage(value - 1);
    } else {
      pageNumber.value = currentPageIndex + 1;
    }
  });

  // Handle navigation buttons
  prevButton.addEventListener("click", () =>
    navigateToPage(currentPageIndex - 1)
  );
  nextButton.addEventListener("click", () =>
    navigateToPage(currentPageIndex + 1)
  ); // Handle keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      nextButton.click();
    } else if (e.key === "ArrowLeft") {
      prevButton.click();
    }
  });

  // Handle save as PDF button
  const savePdfButton = document.querySelector(".save-pdf-button");
  savePdfButton.addEventListener("click", async () => {
    // Prepare content for PDF
    const originalZoom = currentZoom;
    currentZoom = 1;
    pagesContainer.style.transform = "scale(1)";

    // Add saving class to container to hide toolbar and handle page headers
    container.classList.add("saving");

    // Show all pages
    const allPages = document.querySelectorAll(".pdf-page");
    allPages.forEach((page) => {
      page.style.display = "block";
      page.classList.add("saving");
    }); // Configure PDF options
    const opt = {
      margin: [0, 0, 0, 0], // Set all margins (top, right, bottom, left) to 0
      filename: "employee-listing.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    try {
      // Generate PDF
      await html2pdf().set(opt).from(pagesContainer).save();
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      // Restore viewer state
      currentZoom = originalZoom;
      pagesContainer.style.transform = `scale(${currentZoom})`;
      container.classList.remove("saving");
      allPages.forEach((page) => {
        page.classList.remove("saving");
      });
      showCurrentPage();
    }
  });

  // Handle print button
  const printButton = document.querySelector(".print-button");
  printButton.addEventListener("click", () => {
    // Prepare for printing
    const originalZoom = currentZoom;
    currentZoom = 1;
    pagesContainer.style.transform = "scale(1)";

    // Show all pages for printing
    const pages = document.querySelectorAll(".pdf-page");
    pages.forEach((page) => {
      page.style.display = "block";
      page.classList.add("printing");
    });

    // Print
    window.print();

    // Restore viewer state
    currentZoom = originalZoom;
    pagesContainer.style.transform = `scale(${currentZoom})`;
    pages.forEach((page) => {
      page.classList.remove("printing");
    });
    showCurrentPage();
  });

  // Initialize the viewer
  const pages = initializePages();
  updateNavigationButtons();
});
