<script setup>
import { h, resolveComponent } from "vue";
import moment from "moment";
import _ from "lodash";

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const columnFilters = ref([
  {
    id: "order_id",
    value: "",
  },
]);
const page = ref(1);
const limit = ref(10);
const isLoading = ref(false);
const isOpen = ref(false);

const filters = reactive({
  date: { start: null, end: null },
  status: null,
  search: null
});

const dashboardStore = useDashboardStore();

const orders = computed(() => {
  const data = dashboardStore.orders;
  const start = (page.value - 1) * limit.value;

  return data.slice(start, start + limit.value);
});
const dataFormat = computed(() => {
  if (!filters.date.start || !filters.date.end) return "Filter Date";

  return `${filters.date.start.toLocaleString()} - ${filters.date.end.toLocaleString()}`;
});
const columns = [
  {
    accessorKey: "order_id",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Order ID",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => row.getValue("order_id"),
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      return new Date(row.getValue("created_at")).toLocaleString("us-US", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    },
  },
  {
    accessorKey: "user_id",
    header: () => h("div", { class: "text-center" }, "User ID"),
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-center" },
        row.getValue("user_id").toLocaleString()
      ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const color = {
        paid: "success",
        failed: "error",
        pending: "warning",
      }[row.getValue("status")];

      return h(
        UBadge,
        { class: "capitalize font-me", variant: "subtle", color },
        () => row.getValue("status")
      );
    },
  },
  {
    accessorKey: "amount",
    header: () => h("div", { class: "text-right" }, "Amount"),
    cell: ({ row }) =>
      h(
        "div",
        { class: "text-right font-medium" },
        `฿ ${row.getValue("amount").toLocaleString()}`
      ),
  },
];

// chart
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: "top" },
    title: { display: true, text: "Monthly Paid Amount" },
    tooltip: {
      callbacks: {
        label: (context) => {
          const v = context.parsed.y ?? context.parsed;
          return `Amount: ${v.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (val) =>
          typeof val === "number"
            ? val.toLocaleString(undefined, { maximumFractionDigits: 0 })
            : val,
      },
    },
  },
};
const chartData = computed(() => {
  if (!orders.value.length) return {
    labels: [],
    datasets: [{
      label: "Sales",
      data: [],
      backgroundColor: "#3b82f6",
    }],
  };

  const groupedMonths = _.groupBy(orders.value, (order) => {
    const date = new Date(order.created_at);
    return date.getMonth();
  });

  const labels = Object.keys(groupedMonths).map((month) =>
    moment().month(month).format("MMM")
  );
  const values = [];

  for (const i in groupedMonths) {
    const amounts = groupedMonths[i].map((data) => data.amount);
    const sum = amounts.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0
    );

    values.push(sum || 0);
  }

  return {
    labels,
    datasets: [{
      label: "Sales",
      data: values,
      backgroundColor: "#3b82f6",
    }],
  };
});

</script>

<template>
  <div class="max-w-6xl mx-auto space-y-4 px-4 py-8">
    <h1 class="font-bold text-2xl">Dashboard</h1>

    <BarChart :chart-data="chartData" :chart-options="options" />

    <div class="flex flex-wrap gap-2">
      <!-- search -->
      <UInput
        placeholder="Filter order..."
        class="max-w-sm"
        v-model="filters.search"
      />
      <!-- date -->
      <UPopover v-model:open="isOpen">
        <UButton
          :label="dataFormat"
          color="neutral"
          variant="subtle"
          icon="material-symbols:calendar-today-rounded"
        />
        <template #content>
          <UCalendar
            range
            v-model="filters.date"
            @update:validModelValue="() => (isOpen = false)"
          />
        </template>
      </UPopover>
      <!-- status -->
      <USelectMenu
        v-model="filters.status"
        placeholder="select status"
        :items="['pending', 'paid', 'failed']"
      />
    </div>
    <UTable
      ref="table"
      :loading="isLoading"
      :columns="columns"
      :data="orders"
      v-model:column-filters="columnFilters"
      class="flex-1"
    />
    <div class="flex justify-center border-t border-default pt-4">
      <UPagination
        :default-page="1"
        :items-per-page="limit"
        :total="dashboardStore.orders.length"
        @update:page="(p) => (page = p)"
      />
    </div>
  </div>
</template>
