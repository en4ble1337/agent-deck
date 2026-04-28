use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{message}")]
    Validation { code: &'static str, message: String },
    #[error("internal error: {0}")]
    Internal(String),
}

#[derive(Debug, Serialize)]
pub struct ErrorEnvelope {
    pub code: String,
    pub message: String,
    pub retryable: bool,
}

impl From<AppError> for ErrorEnvelope {
    fn from(error: AppError) -> Self {
        match error {
            AppError::Validation { code, message } => Self {
                code: code.to_string(),
                message,
                retryable: false,
            },
            AppError::Internal(message) => Self {
                code: "INTERNAL_ERROR".to_string(),
                message,
                retryable: false,
            },
        }
    }
}
