use crate::core::{storage::SharedStorage, terminal::TerminalManager};

pub struct AppState {
    pub storage: SharedStorage,
    pub terminals: TerminalManager,
}
