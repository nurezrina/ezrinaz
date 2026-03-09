-- Azure SQL DDL for Feedback Table
-- Schema: feedback (tenant-scoped)

CREATE TABLE [dbo].[Feedback] (
    [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [TenantId] NVARCHAR(50) NOT NULL,
    [UserId] NVARCHAR(50) NOT NULL,
    [ActingAsUserId] NVARCHAR(50) NULL,
    [PageUrl] NVARCHAR(2048) NOT NULL,
    [RouteName] NVARCHAR(255) NOT NULL,
    [Type] NVARCHAR(10) NOT NULL CHECK ([Type] IN ('CSAT', 'NPS', 'TEXT')),
    [Score] INT NULL, -- CSAT 1-5, NPS 0-10
    [Category] NVARCHAR(50) NULL CHECK ([Category] IN ('Bug', 'Feature Request', 'UX', 'Performance', 'Other')),
    [Message] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [AppVersion] NVARCHAR(50) NOT NULL,
    [UserAgent] NVARCHAR(MAX) NULL,
    [ViewportWidth] INT NULL,
    [ViewportHeight] INT NULL,
    [Locale] NVARCHAR(20) NULL
);

-- Indexes for performance and tenant isolation
CREATE INDEX IX_Feedback_TenantId ON [dbo].[Feedback] ([TenantId]);
CREATE INDEX IX_Feedback_UserId ON [dbo].[Feedback] ([UserId]);
CREATE INDEX IX_Feedback_CreatedAt ON [dbo].[Feedback] ([CreatedAt] DESC);

-- Audit log entry (assuming an existing AuditLog table)
-- INSERT INTO [dbo].[AuditLog] (UserId, TenantId, Action, Details, Timestamp)
-- VALUES (@UserId, @TenantId, 'FEEDBACK_SUBMITTED', @FeedbackDetails, SYSDATETIMEOFFSET());
