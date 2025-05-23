// Store all ShowMore instances
let showMoreInstances = [];

class ShowMore extends HTMLElement {
  constructor() {
    super();

    showMoreInstances.push(this);

    // Create shadow DOM
    this.attachShadow({ mode: "open" });

    // Create and append styles
    const style = document.createElement("style");
    style.textContent = `
            :host {
                display: block;
            }
            .header ::slotted(*) {
                margin: 0;
            }
            .content-wrapper {
                position: relative;
                max-height: var(--list-max-height, 100px);
                overflow: hidden;
                transition: max-height 0.3s ease-out;
            }
            .content-wrapper.expanded {
                max-height: none;
            }
            .content-wrapper:not(.expanded)::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 40px;
                background: linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%);
                pointer-events: none;
            }
            .toggle-button {
                display: none;
                background: #ffffff;
                color: #2b4162;
                border: 1px solid #e0e0e0;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 500;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            .toggle-button:hover {
                background: #f8f9fa;
                border-color: #2b4162;
            }
            .expand-icon {
                transition: transform 0.3s ease;
            }
            .content-wrapper.expanded + .toggle-button .expand-icon {
                transform: rotate(180deg);
            }
        `;

    this.shadowRoot.appendChild(style);

    // Create and append content structure
    const content = document.createElement("div");
    content.innerHTML = `
            <div class="header">
                <slot name="header"></slot>
            </div>
            <div class="content-wrapper">
                <slot name="content"></slot>
            </div>
            <button class="toggle-button">
                <i class="expand-icon fas fa-caret-down"></i>
                <span>Show More</span>
            </button>
        `;

    this.shadowRoot.appendChild(content);

    this.contentWrapper = this.shadowRoot.querySelector(".content-wrapper");
    this.toggleButton = this.shadowRoot.querySelector(".toggle-button");
    this.buttonText = this.toggleButton.querySelector("span");
    this.expandIcon = this.toggleButton.querySelector(".expand-icon");
  }

  connectedCallback() {
    // Wait for slotted content to be available
    requestAnimationFrame(() => {
      const contentSlot = this.shadowRoot.querySelector('slot[name="content"]');
      const contentHeight = contentSlot
        .assignedElements()
        .reduce((total, element) => {
          return total + element.offsetHeight;
        }, 0);

      const maxHeight =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--list-max-height"
          )
        ) || 100;

      if (contentHeight > maxHeight) {
        this.classList.add("has-more");
        this.toggleButton.addEventListener("click", () => {
          this.toggleContent();
          this.saveState();
        });
      } else {
        this.toggleButton.style.display = "none";
      }

      // Load saved state after initialization
      this.loadState();
    });
  }

  toggleContent() {
    const isExpanded = this.contentWrapper.classList.toggle("expanded");
    this.buttonText.textContent = isExpanded ? "Show Less" : "Show More";
  }

  loadState() {
    const savedStates = JSON.parse(
      localStorage.getItem("showMoreStates") || "{}"
    );
    const headerText = this.querySelector('[slot="header"]').textContent;
    if (savedStates[headerText]) {
      this.contentWrapper.classList.add("expanded");
      this.toggleButton.textContent = "Show Less";
    }
  }

  saveState() {
    const savedStates = JSON.parse(
      localStorage.getItem("showMoreStates") || "{}"
    );
    const headerText = this.querySelector('[slot="header"]').textContent;
    savedStates[headerText] =
      this.contentWrapper.classList.contains("expanded");
    localStorage.setItem("showMoreStates", JSON.stringify(savedStates));
  }
}

// Register the custom element
customElements.define("show-more", ShowMore);

// Initialize toggle all button functionality
document.addEventListener("DOMContentLoaded", () => {
  const toggleAllButton = document.getElementById("toggleAllButton");
  if (toggleAllButton) {
    const updateToggleAllButtonText = () => {
      const allExpanded = showMoreInstances.every((instance) =>
        instance.contentWrapper.classList.contains("expanded")
      );
      toggleAllButton.classList.toggle("expanded", allExpanded);
      toggleAllButton.querySelector(".button-text").textContent = allExpanded
        ? "Collapse All"
        : "Expand All";
    };

    toggleAllButton.addEventListener("click", () => {
      const allExpanded = showMoreInstances.every((instance) =>
        instance.contentWrapper.classList.contains("expanded")
      );

      showMoreInstances.forEach((instance) => {
        if (instance.classList.contains("has-more")) {
          if (allExpanded) {
            if (instance.contentWrapper.classList.contains("expanded")) {
              instance.toggleContent();
            }
          } else {
            if (!instance.contentWrapper.classList.contains("expanded")) {
              instance.toggleContent();
            }
          }
          instance.saveState();
        }
      });

      updateToggleAllButtonText();
    });

    // Set initial button text after a short delay to ensure all instances are initialized
    setTimeout(updateToggleAllButtonText, 100);
  }
});
