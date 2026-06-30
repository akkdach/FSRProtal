const prodSqlService = require('../services/prodSqlService');
const { logToFile } = require('../utils/logger');

class MasterDataController {
    async getDropdowns(req, res) {
        try {
            const category = req.query.category;
            logToFile(`[MasterDataController] Fetching dropdowns for category: ${category || 'ALL'}`);
            
            const data = await prodSqlService.getMasterDropdowns(category);
            
            res.json({ success: true, data });
        } catch (error) {
            logToFile(`[MasterDataController] Error fetching dropdowns: ${error.message}`);
            res.status(500).json({ success: false, error: 'Failed to fetch dropdowns', details: error.message });
        }
    }

    async createDropdown(req, res) {
        try {
            const { category, optionName, description, createdBy } = req.body;
            
            if (!category || !optionName) {
                return res.status(400).json({ success: false, error: 'Category and OptionName are required' });
            }

            logToFile(`[MasterDataController] Creating new dropdown option: ${category} - ${optionName}`);
            
            const result = await prodSqlService.createMasterDropdown({ category, optionName, description, createdBy });
            
            res.status(201).json({ success: true, message: 'Created successfully', data: result });
        } catch (error) {
            logToFile(`[MasterDataController] Error creating dropdown: ${error.message}`);
            res.status(500).json({ success: false, error: 'Failed to create dropdown', details: error.message });
        }
    }

    async updateDropdown(req, res) {
        try {
            const { id } = req.params;
            const { optionName, description, isActive, updatedBy } = req.body;

            if (!id || !optionName) {
                return res.status(400).json({ success: false, error: 'ID and OptionName are required' });
            }

            logToFile(`[MasterDataController] Updating dropdown option ID: ${id}`);
            
            await prodSqlService.updateMasterDropdown(id, { optionName, description, isActive, updatedBy });
            
            res.json({ success: true, message: 'Updated successfully' });
        } catch (error) {
            logToFile(`[MasterDataController] Error updating dropdown ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ success: false, error: 'Failed to update dropdown', details: error.message });
        }
    }

    async deleteDropdown(req, res) {
        try {
            const { id } = req.params;
            const updatedBy = req.body.updatedBy || req.query.updatedBy || 'SYSTEM';

            if (!id) {
                return res.status(400).json({ success: false, error: 'ID is required' });
            }

            logToFile(`[MasterDataController] Deactivating dropdown option ID: ${id}`);
            
            await prodSqlService.deleteMasterDropdown(id, updatedBy);
            
            res.json({ success: true, message: 'Deactivated successfully' });
        } catch (error) {
            logToFile(`[MasterDataController] Error deactivating dropdown ID ${req.params.id}: ${error.message}`);
            res.status(500).json({ success: false, error: 'Failed to delete/deactivate dropdown', details: error.message });
        }
    }
}

module.exports = new MasterDataController();
