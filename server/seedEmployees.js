require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/portal_db';
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const employeeSchema = new mongoose.Schema({
            fullName: String,
            employeeId: { type: String, unique: true },
            password: String,
            role: String,
            department: String,
            balance: { type: Number, default: 50000 },
            createdAt: { type: Date, default: Date.now }
        });

        const Employee = mongoose.model('Employee', employeeSchema);

        await Employee.deleteMany({});
        console.log('🗑️ Cleared existing employees');

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
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedEmployees();