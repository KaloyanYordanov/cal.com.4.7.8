import { parseRecurringEvent, parseEventTypeColor } from "@calcom/lib";
import { prisma } from "@calcom/prisma";
import { bookingMinimalSelect } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { TAdminGetAllBookingsSchema } from "./getAllBookings.schema";

type GetAllBookingsOptions = {
  input: TAdminGetAllBookingsSchema;
};

const getAllBookingsHandler = async ({ input }: GetAllBookingsOptions) => {
  const take = input.limit ?? 250;
  const skip = input.cursor ?? 0;

  const where: Prisma.BookingWhereInput = {
    AND: [
      {
        // Event starts before the view window ends
        startTime: {
          lt: new Date(input.beforeEndDate),
        },
      },
      {
        // Event ends after the view window starts
        endTime: {
          gt: new Date(input.afterStartDate),
        },
      },
    ],
  };

  // Optional filters
  if (input.userIds && input.userIds.length > 0) {
    (where.AND as Prisma.BookingWhereInput[]).push({
      OR: [
        { userId: { in: input.userIds } },
        {
          eventType: {
            hosts: {
              some: {
                userId: { in: input.userIds },
                isFixed: true,
              },
            },
          },
        },
      ],
    });
  }

  if (input.teamIds && input.teamIds.length > 0) {
    (where.AND as Prisma.BookingWhereInput[]).push({
      eventType: {
        team: {
          id: { in: input.teamIds },
        },
      },
    });
  }

  if (input.eventTypeIds && input.eventTypeIds.length > 0) {
    (where.AND as Prisma.BookingWhereInput[]).push({
      eventTypeId: { in: input.eventTypeIds },
    });
  }

  if (input.status) {
    const statusFilters: Record<string, Prisma.BookingWhereInput> = {
      upcoming: {
        endTime: { gte: new Date() },
        OR: [
          {
            recurringEventId: { not: null },
            status: { equals: BookingStatus.ACCEPTED },
          },
          {
            recurringEventId: { equals: null },
            status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
          },
        ],
      },
      recurring: {
        AND: [
          { NOT: { recurringEventId: { equals: null } } },
          { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REJECTED] } },
        ],
      },
      past: {
        endTime: { lte: new Date() },
        AND: [
          { NOT: { status: { equals: BookingStatus.CANCELLED } } },
          { NOT: { status: { equals: BookingStatus.REJECTED } } },
        ],
      },
      cancelled: {
        OR: [{ status: { equals: BookingStatus.CANCELLED } }, { status: { equals: BookingStatus.REJECTED } }],
      },
      unconfirmed: {
        endTime: { gte: new Date() },
        status: { equals: BookingStatus.PENDING },
      },
    };

    if (statusFilters[input.status]) {
      (where.AND as Prisma.BookingWhereInput[]).push(statusFilters[input.status]);
    }
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      ...bookingMinimalSelect,
      uid: true,
      recurringEventId: true,
      location: true,
      status: true,
      paid: true,
      responses: true,
      eventType: {
        select: {
          slug: true,
          id: true,
          title: true,
          eventName: true,
          price: true,
          recurringEvent: true,
          currency: true,
          metadata: true,
          eventTypeColor: true,
          schedulingType: true,
          length: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      payment: {
        select: {
          paymentOption: true,
          amount: true,
          currency: true,
          success: true,
        },
      },
      references: true,
    },
    orderBy: { startTime: "asc" },
    take: take + 1,
    skip,
  });

  const bookingsFetched = bookings.length;
  let nextCursor: typeof skip | null = skip;
  if (bookingsFetched > take) {
    nextCursor += bookingsFetched;
  } else {
    nextCursor = null;
  }

  const enrichedBookings = bookings.slice(0, take).map((booking) => ({
    ...booking,
    eventType: {
      ...booking.eventType,
      recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
      eventTypeColor: parseEventTypeColor(booking.eventType?.eventTypeColor),
      price: booking.eventType?.price || 0,
      currency: booking.eventType?.currency || "usd",
      metadata: EventTypeMetaDataSchema.parse(booking.eventType?.metadata || {}),
    },
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
  }));

  return {
    bookings: enrichedBookings,
    nextCursor,
  };
};

export default getAllBookingsHandler;
