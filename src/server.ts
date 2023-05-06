import express from 'express'
import * as dotenv from 'dotenv'
import prisma from './lib/prisma'
import * as Yup from 'yup'
import cors from 'cors'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.post('/transaction', async (req, res) => {
	const { description, type, price, category } = req.body

	try {
		const transaction = await prisma.transaction.create({
			data: {
				description,
				price,
				type,
				category,
			},
		})

		return res.status(201).send(transaction)
	} catch (error: any) {
		return res.status(400).send(error.message)
	}
})

app.get('/transaction', async (req, res) => {
	try {
		const transactions = await prisma.transaction.findMany()

		return res.status(200).json(transactions)
	} catch (error: any) {
		return res.status(400).json(error.message)
	}
})

app.get('/transaction/count', async (req, res) => {
	try {
		const count = await prisma.transaction.count()

		return res.status(200).json(count)
	} catch (error) {
		return res.status(400).json(error)
	}
})

//localhgost:3334/transaction/search?limit=5&page=1&search=sdfg
app.get('/transaction/search', async (req, res) => {
	const { page = 1, limit = 10, search = '' } = req.query

	const searchSchema = Yup.object({
		page: Yup.number()
			.typeError('O campo page precisa ser um numero')
			.positive(),
		limit: Yup.number()
			.typeError('O campo page precisa ser um numero')
			.positive()
			.max(20, 'O Tamanho máximo da lista é 20'),
		search: Yup.string(),
	})

	try {
		const values = await searchSchema.validate({ page, limit, search })

		const count = await prisma.transaction.count({
			where: {
				description: {
					contains: search.toString(),
				},
			},
		})

		console.log(search.toString())
		const transactions = await prisma.transaction.findMany({
			where: {
				description: {
					contains: search.toString(),
				},
			},
			skip: (Number(values.page) - 1) * Number(values.limit),
			take: Number(values.limit),
		})

		res.status(200).json({ count, transactions })
	} catch (error: any) {
		return res.status(400).send(error.message)
	}
})

app.get('/transaction/amount', async (req, res) => {
	try {
		const takeDeposit = await prisma.transaction.groupBy({
			by: ['type'],
			_sum: {
				price: true,
			},
			where: {
				type: true,
			},
		})

		const takeWithdraw = await prisma.transaction.groupBy({
			by: ['type'],
			_sum: {
				price: true,
			},
			where: {
				type: false,
			},
		})

		const deposit = takeDeposit[0]?._sum.price ?? 0
		const withdraw = takeWithdraw[0]?._sum.price ?? 0
		const total = deposit - withdraw

		return res.status(200).json({ total, deposit, withdraw })
	} catch (error: any) {
		return res.status(400).send(error.message)
	}
})

app.listen(process.env.PORT, () => {
	console.log(`Servidor rodando na porta ${process.env.PORT}`)
})
