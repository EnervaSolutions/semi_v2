# Complete Application Data Available in SEMI Portal

## Core Application Information
- **Application ID** (auto-generated, e.g., MAGINC-001-102)
- **Application Title**
- **Application Description**
- **Activity Type** (FRA, SEM, EAA, EMIS, CR)
- **Application Status** (draft, in_progress, submitted, under_review, approved, rejected, needs_revision)
- **Created Date**
- **Updated Date**
- **Submitted Date**
- **Submitted By** (user ID reference)

## Company Information
- **Company ID**
- **Company Name**
- **Company Short Name** (auto-generated code)
- **Business Number**
- **Company Address** (street, city, province, postal code, country)
- **Company Website**
- **Company Size** (number of employees)
- **Company Type** (participant/contractor status)
- **Company Registration Date**
- **Is Contractor** (boolean flag)
- **Is Visible** (active status)

## Facility Information
- **Facility ID**
- **Facility Name**
- **Facility Code** (e.g., 001, 002)
- **Facility Description**
- **NAICS Code** (industry classification)
- **Facility Sector** (derived from NAICS)
- **Facility Category** (derived from NAICS)
- **Facility Type** (detailed NAICS classification)
- **Facility Address** (street, city, province, postal code, country)
- **Gross Floor Area** (with unit: sq_ft/sq_m)
- **Gross Floor Area Temporary Status**
- **Year Built**
- **Weekly Operating Hours**
- **Weekly Operating Hours Temporary Status**
- **Number of Workers (Main Shift)**
- **Number of Workers Temporary Status**
- **Type of Operation** (continuous, semi_continuous, batch)
- **Has EMIS** (Energy Management Information System)
- **Has Energy Manager**
- **Process and Systems** (detailed array of facility processes)
- **Contact Information** (derived from description field)

## Submitter/User Information
- **User ID**
- **First Name**
- **Last Name**
- **Email Address**
- **Business Mobile**
- **Role** (team_member, company_admin, contractor_individual, etc.)
- **Permission Level** (viewer, editor, manager, owner)
- **Profile Image URL**
- **Account Creation Date**
- **Last Updated Date**
- **Email Verification Status**
- **2FA Status**
- **Account Status** (active/inactive)

## Reviewer Information (if reviewed)
- **Reviewer User ID**
- **Reviewer Name**
- **Reviewer Email**
- **Review Date**
- **Review Notes**

## Application Submissions Data
- **Submission ID**
- **Form Template ID**
- **Phase** (pre_activity, post_activity)
- **Submission Data** (JSON form responses)
- **Submission Status** (draft, submitted)
- **Approval Status** (pending, approved, rejected, needs_revision)
- **Submitted Date**
- **Submitted By User**
- **Reviewed By**
- **Reviewed Date**
- **Review Notes**

## Contractor Assignment Information
- **Assignment ID**
- **Assigned Contractor User ID**
- **Contractor Name**
- **Contractor Email**
- **Contractor Company ID**
- **Contractor Company Name**
- **Assignment Permissions** (array of permissions)
- **Assigned By** (user who made assignment)
- **Assignment Date**
- **Assignment Status** (active/inactive)

## Contractor Company Details
- **Contractor Company Information** (same as regular company)
- **Supported Activities** (FRA, SEM, EAA, EMIS, CR)
- **Technology Capabilities**
- **Service Regions**
- **Capital Retrofit Technologies** (specific tech categories)
- **GST Registration Status**
- **WCB Coverage Status**
- **Insurance Coverage Status**
- **Code of Conduct Status**
- **Code of Conduct Signed Date**

## Individual Contractor Details
- **Contractor User ID**
- **Professional Certifications**
- **Experience Level**
- **Specializations**
- **Contact Information**

## Document Information
- **Document ID**
- **Original Filename**
- **Document Type** (pre_activity, post_activity, supporting, template, other)
- **File Size**
- **MIME Type**
- **Upload Date**
- **Uploaded By** (user information)
- **File Path**
- **Is Template** (boolean)
- **Is Global** (boolean)

## Activity Settings & Templates
- **Activity Type Settings**
- **Is Activity Enabled**
- **Requires FRA**
- **Maximum Applications Allowed**
- **Contractor Assignment Allowed**
- **Required Contractor Activities**
- **Form Templates** (legacy and new activity templates)
- **Template Fields** (JSON form definitions)
- **Template Order/Sequence**
- **Template Prerequisites**

## Facility Activity Settings
- **Per-facility activity enablement**
- **Enabled by** (system admin)
- **Enabled date**
- **Activity-specific facility permissions**

## Notification History
- **Notification ID**
- **Notification Type** (facility_added, application_submitted, etc.)
- **Message Content**
- **Read Status**
- **Created Date**
- **Related Application ID**
- **From/To User Information**

## Team Management Data
- **Team Members** (all users in company)
- **Team Invitations** (pending/accepted/declined)
- **Permission Levels**
- **Role Assignments**
- **Team Changes History**

## Historical Assignment Data
- **Company Application Assignment History**
- **Contractor Assignment Changes**
- **Permission Changes Over Time**
- **Status Change Logs**

## Derived/Calculated Information
- **Application Progress Status** (based on submissions)
- **Template Completion Status**
- **Workflow Stage** (draft, pre-activity, post-activity)
- **Days Since Creation**
- **Days Since Last Update**
- **Template Submission Counts**
- **Document Upload Counts**
- **Team Member Counts**

## Session & Authentication Data
- **Current User Session**
- **Login History**
- **Permission Context**
- **Access Logs**

## System Metadata
- **Database Record IDs**
- **Creation Timestamps**
- **Update Timestamps**
- **Version Information**
- **Audit Trail Data**