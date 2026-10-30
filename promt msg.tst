Create a modern, professional, fully responsive web application using **HTML5, CSS3, and Vanilla JavaScript only** (no backend). The application will be used to analyze Amazon Gating/Ungating data by simply copying data from Excel and pasting it into the application.

## Main Workflow
- Provide a large paste area where users can press **Ctrl + V** to paste Excel data directly.
- Automatically detect tabular data copied from Excel.
- Parse all rows and columns without requiring file upload.
- Generate reports and dashboards instantly after pasting.

## Dashboard Statistics
Display cards showing:
- Total Records
- Gated
- Ungate
- Auto Ungate
- Review
- Approved
- Rejected
- Copy Listed
- Invoice Submitted
- Invoice Pending
- Case Open
- Case Re-open 1
- Case Re-open 2
- Re-Apply
- Other statuses detected automatically

## Dynamic Analysis
The application must automatically detect all columns and work with different Excel structures without hardcoding column positions.

If additional columns are added in future, the application should automatically include them in filtering and reporting.

## Reports
Generate detailed reports by:
- Company
- Category
- Supplier
- Brand
- Status
- Case Status
- Date
- ASIN
- Any additional detected column

Each report should show:
- Total Records
- Approved
- Review
- Rejected
- Ungate
- Auto Ungate
- Copy Listed
- Pending

## Filters
Provide dynamic filters for every detected column.

Include:
- Search box
- Company Filter
- Category Filter
- Supplier Filter
- Brand Filter
- Status Filter
- Date Range Filter

## Charts
Create interactive charts using Chart.js:
- Status Distribution (Pie Chart)
- Company Comparison (Bar Chart)
- Category Breakdown
- Supplier Performance
- Daily/Monthly Trends

## Data Table
Display all parsed data in a sortable table with:
- Pagination
- Search
- Column Sorting
- Sticky Header
- Responsive Layout

## Export
Allow exporting:
- Excel
- CSV
- PDF

## User Interface
Design a premium admin dashboard with:
- Dark/Light Mode
- Sidebar Navigation
- Dashboard Cards
- Modern Color Scheme
- Smooth Animations
- Mobile Responsive Layout

## Performance
The application should handle 10,000+ rows efficiently without freezing.

## Code Structure
Organize the project into:

index.html
css/style.css
js/app.js
js/dashboard.js
js/parser.js
js/charts.js
js/filters.js
js/export.js

Write clean, modular, well-commented code that is easy to maintain and extend. The final result should look like a professional SaaS analytics dashboard similar to Power BI or modern admin templates.