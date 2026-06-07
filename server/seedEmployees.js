// server/seedEmployees.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Employee data - these are your static employees (no registration needed)
const employees = [
    {
        fullName: 'Landile Fakazi',
        employeeId: 'EMP001',
        password: 'Employee@123',
        role: 'admin',
        department: 'Finance'
    },
    {
        fullName: 'Asanda Nxumalo',
        employeeId: 'EMP002',
        password: 'Sarah@456',
        role: 'processor',
        department: 'Payments'
    },
    {
        fullName: 'Wandile Phakathi',
        employeeId: 'EMP003',
        password: 'Mike@789',
        role: 'viewer',
        department: 'Compliance'
    }
];

async function seedEmployees() {
    try {
        // Connect to MongoDB
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portal_db';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Define Employee Schema
        const employeeSchema = new mongoose.Schema({
            fullName: { type: String, required: true },
            employeeId: { type: String, required: true, unique: true },
            password: { type: String, required: true },
            role: { type: String, default: 'employee' },
            department: { type: String },
            createdAt: { type: Date, default: Date.now }
        });

        const Employee = mongoose.model('Employee', employeeSchema);

        // Clear existing employees (optional - comment out if you want to keep)
        await Employee.deleteMany({});
        console.log('🗑️ Cleared existing employees');

        // Insert employees
        for (const emp of employees) {
            const hashedPassword = await bcrypt.hash(emp.password, 12);
            const employee = new Employee({
                fullName: emp.fullName,
                employeeId: emp.employeeId,
                password: hashedPassword,
                role: emp.role,
                department: emp.department
            });
            await employee.save();
            console.log(`✅ Added employee: ${emp.fullName} (${emp.employeeId})`);
        }

        console.log('🎉 All employees seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding employees:', error);
        process.exit(1);
    }
}

seedEmployees();